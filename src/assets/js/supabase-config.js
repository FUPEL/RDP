// Supabase configuration and database helper functions
;(() => {
  const SUPABASE_URL = "https://ovcioxruafodalhtkuyo.supabase.co"
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Y2lveHJ1YWZvZGFsaHRrdXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMzUwMDAsImV4cCI6MjA2ODgxMTAwMH0.eJIsraPIA0JfyUBMqNaHuHlG3zH_ImzZ3jS-Mjq7VtE"

  let supabaseClient = null // This will hold the initialized Supabase client

  // Function to initialize Supabase client and set up auth listener
  function initializeSupabaseAndAuthListener() {
    // Only initialize if window.supabase is available and client hasn't been initialized yet
    if (typeof window.supabase !== "undefined" && supabaseClient === null) {
      try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
        console.log("Supabase config: Supabase client initialized successfully.")

        // Set up auth state listener immediately after client is ready
        supabaseClient.auth.onAuthStateChange((event, session) => {
          console.log("Supabase config: Auth state changed:", event, session)
          if (event === "SIGNED_OUT") {
            localStorage.removeItem("rememberMe")
            sessionStorage.clear()
            if (!window.location.pathname.includes("login-v1.html")) {
              window.location.href = "../pages/login-v1.html"
            }
          }
        })
        console.log("Supabase config: Supabase auth listener set.")
      } catch (e) {
        console.error("Supabase config: Error initializing Supabase client:", e)
        supabaseClient = null // Reset client if initialization fails
        setTimeout(initializeSupabaseAndAuthListener, 200) // Retry after a short delay
      }
    } else if (supabaseClient !== null) {
      console.log("Supabase config: Client already initialized, skipping redundant initialization.")
    } else if (typeof window.supabase === "undefined") {
      console.warn("Supabase config: Supabase library (window.supabase) not yet loaded. Retrying initialization...")
      setTimeout(initializeSupabaseAndAuthListener, 100) // Retry after a short delay
    }
  }

  // Call initialization immediately when this script runs
  initializeSupabaseAndAuthListener()

  // Objek pembantu untuk interaksi database dan autentikasi
  window.DatabaseHelper = {
    // Internal getter to ensure client is available before any operation
    _getSupabaseClient: () => {
      if (!supabaseClient) {
        console.error("Supabase config: Supabase client is not initialized. Operations will fail.")
        return null // Return null instead of throwing
      }
      return supabaseClient
    },

    // Fungsi generik untuk menyimpan data ke tabel Supabase mana pun
    saveData: async (tableName, data) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log(`Supabase config: Saving data to ${tableName}:`, data)
        const { data: savedData, error } = await client.from(tableName).insert([data]).select()
        if (error) {
          console.error(`Supabase config: Error saving data to ${tableName}:`, error)
          return { success: false, data: null, error: error.message }
        }
        console.log(`Supabase config: Data saved to ${tableName} successfully:`, savedData)
        return { success: true, data: savedData }
      } catch (err) {
        console.error(`Supabase config: Exception in saveData to ${tableName}:`, err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi generik untuk memperbarui data di tabel Supabase mana pun
    updateData: async (tableName, id, updatedData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log(`Supabase config: Updating data in ${tableName} with ID ${id}:`, updatedData)
        const { data, error } = await client.from(tableName).update(updatedData).eq("id", id).select()
        if (error) {
          console.error(`Supabase config: Error updating data in ${tableName}:`, error)
          return { success: false, data: null, error: error.message }
        }
        console.log(`Supabase config: Data in ${tableName} updated successfully:`, data)
        return { success: true, data }
      } catch (err) {
        console.error(`Supabase config: Exception in updateData to ${tableName}:`, err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi generik untuk menghapus data dari tabel Supabase mana pun
    deleteData: async (tableName, id) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        console.log(`Supabase config: Deleting data from ${tableName} with ID ${id}`)
        const { error } = await client.from(tableName).delete().eq("id", id)
        if (error) {
          console.error(`Supabase config: Error deleting data from ${tableName}:`, error)
          return { success: false, error: error.message }
        }
        console.log(`Supabase config: Data from ${tableName} deleted successfully.`)
        return { success: true }
      } catch (err) {
        console.error(`Supabase config: Exception in deleteData from ${tableName}:`, err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk autentikasi pengguna dengan remember me
    signInWithPassword: async (email, password, rememberMe = false) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { data: null, error: new Error("Supabase client not ready.") }

        console.log("Supabase config: Attempting login with:", { email, rememberMe })
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        })
        console.log("Supabase config: Login response:", { data, error })
        if (data && data.session && rememberMe) {
          localStorage.setItem("rememberMe", "true")
        } else if (!rememberMe) {
          localStorage.removeItem("rememberMe")
        }
        return { data, error }
      } catch (err) {
        console.error("Supabase config: Login exception:", err)
        return { data: null, error: err }
      }
    },

    // Fungsi untuk mendapatkan sesi pengguna saat ini
    getCurrentSession: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return null // Return null if client not ready

        const {
          data: { session },
          error,
        } = await client.auth.getSession()
        console.log("Supabase config: Current session:", session)
        return session
      } catch (err) {
        console.error("Supabase config: Error getting session:", err)
        return null
      }
    },

    // Fungsi untuk mendapatkan user saat ini
    getCurrentUser: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return null // Return null if client not ready

        const {
          data: { user },
          error,
        } = await client.auth.getUser()
        console.log("Supabase config: Current user:", user)
        return user
      } catch (err) {
        console.error("Supabase config: Error getting user:", err)
        return null
      }
    },

    // Fungsi untuk mendapatkan profile pengguna lengkap (role + display_name)
    getUserProfile: async (userId) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return null // Return null if client not ready

        if (!userId) {
          console.error("Supabase config: User ID is required to get profile.")
          return null
        }
        console.log("Supabase config: Getting profile for user:", userId)
        // Reverted to use 'profiles' table and 'id' column as per original ZIP
        const { data, error } = await client.from("profiles").select("role, display_name").eq("id", userId).single()
        if (error) {
          console.error("Supabase config: Error getting user profile:", error)
          return null
        }
        console.log("Supabase config: User profile data:", data)
        return data
      } catch (err) {
        console.error("Supabase config: Error in getUserProfile:", err)
        return null
      }
    },

    // Fungsi untuk mendapatkan role pengguna dari tabel profiles
    getUserRole: async (userId) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return null // Return null if client not ready

        if (!userId) {
          console.error("Supabase config: User ID is required to get role.")
          return null
        }
        console.log("Supabase config: Getting role for user:", userId)
        // Reverted to use 'profiles' table and 'id' column as per original ZIP
        const { data, error } = await client.from("profiles").select("role").eq("id", userId).single()
        if (error) {
          console.error("Supabase config: Error getting user role:", error)
          return null
        }
        console.log("Supabase config: User role data:", data)
        return data ? data.role : null
      } catch (err) {
        console.error("Supabase config: Error in getUserRole:", err)
        return null
      }
    },

    // Fungsi untuk logout
    signOut: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { error: new Error("Supabase client not ready.") }

        localStorage.removeItem("rememberMe")
        const { error } = await client.auth.signOut()
        return { error }
      } catch (err) {
        return { error: err }
      }
    },

    // ===== NOTIFICATION FUNCTIONS =====

    // Fungsi untuk membuat notifikasi baru
    createNotification: async (userId, title, message, activityType, createdByName) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        const currentUser = await window.DatabaseHelper.getCurrentUser()
        const notificationData = {
          user_id: userId,
          title: title,
          message: message,
          activity_type: activityType,
          created_by: currentUser?.id,
          created_by_name: createdByName,
          is_read: false, // Ensure this is explicitly set
          created_at: new Date().toISOString(),
        }
        console.log("Supabase config: Creating notification:", notificationData)
        const { data, error } = await client.from("notifications").insert([notificationData]).select()
        if (error) {
          console.error("Supabase config: Error creating notification:", error)
          return { success: false, error: error.message }
        }
        console.log("Supabase config: Notification created successfully:", data)
        return { success: true, data }
      } catch (err) {
        console.error("Supabase config: Exception in createNotification:", err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk mengirim notifikasi ke semua Direktur
    notifyDirectors: async (title, message, activityType) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        // Get current user info
        const currentUser = await window.DatabaseHelper.getCurrentUser()
        const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
        console.log("Supabase config: notifyDirectors - Current User:", currentUser)
        console.log("Supabase config: notifyDirectors - Current Profile:", currentProfile)

        // Get all users with Direktur role
        // Reverted to use 'profiles' table and 'id' column as per original ZIP
        const { data: directors, error: directorsError } = await client
          .from("profiles")
          .select("id, display_name")
          .eq("role", "Direktur")
        if (directorsError) {
          console.error("Supabase config: Error getting directors:", directorsError)
          return { success: false, error: directorsError.message }
        }
        console.log("Supabase config: notifyDirectors - Found Directors:", directors)

        if (!directors || directors.length === 0) {
          console.log("Supabase config: No directors found to notify")
          return { success: true, message: "No directors to notify" }
        }
        // Create notifications for all directors
        const notifications = directors.map((director) => ({
          user_id: director.id,
          title: title,
          message: message,
          activity_type: activityType,
          created_by: currentUser?.id,
          created_by_name: currentProfile?.display_name || currentUser?.email,
          is_read: false, // Ensure this is explicitly set
          created_at: new Date().toISOString(),
        }))
        console.log("Supabase config: notifyDirectors - Notifications to insert:", notifications)

        const { data, error } = await client.from("notifications").insert(notifications).select()
        if (error) {
          console.error("Supabase config: Error creating notifications for directors:", error)
          return { success: false, error: error.message }
        }
        console.log(
          `Supabase config: Successfully created ${notifications.length} notifications for directors. Inserted data:`,
          data,
        )
        return { success: true, data }
      } catch (err) {
        console.error("Supabase config: Exception in notifyDirectors:", err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan jumlah notifikasi yang belum dibaca
    getUnreadNotificationCount: async (userId) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, count: 0, error: "Supabase client not ready." }

        const { count, error } = await client
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false)
        if (error) {
          console.error("Supabase config: Error getting unread notification count:", error)
          return { success: false, count: 0, error: error.message }
        }
        return { success: true, count: count || 0 }
      } catch (err) {
        console.error("Supabase config: Exception in getUnreadNotificationCount:", err)
        return { success: false, count: 0, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan notifikasi pengguna
    getUserNotifications: async (userId, limit = 20) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        const { data, error } = await client
          .from("notifications")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(limit)
        if (error) {
          console.error("Supabase config: Error getting notifications:", error)
          return { success: false, data: [], error: error.message }
        }
        return { success: true, data: data || [] }
      } catch (err) {
        console.error("Supabase config: Exception in getUserNotifications:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk menandai notifikasi sebagai sudah dibaca
    markNotificationAsRead: async (notificationId) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        const { data, error } = await client
          .from("notifications")
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq("id", notificationId)
          .select() // Added .select()
        if (error) {
          console.error("Supabase config: Error marking notification as read:", error)
          return { success: false, error: error.message }
        }
        return { success: true, data }
      } catch (err) {
        console.error("Supabase config: Exception in markNotificationAsRead:", err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk menandai semua notifikasi sebagai sudah dibaca
    markAllNotificationsAsRead: async (userId) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        const { data, error } = await client
          .from("notifications")
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq("user_id", userId)
          .eq("is_read", false)
          .select() // Added .select()
        if (error) {
          console.error("Supabase config: Error marking all notifications as read:", error)
          return { success: false, error: error.message }
        }
        return { success: true, data }
      } catch (err) {
        console.error("Supabase config: Exception in markAllNotificationsAsRead:", err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk menghapus semua notifikasi
    clearAllNotifications: async (userId) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        console.log("Supabase config: Deleting all notifications for user:", userId)
        const { data, error } = await client.from("notifications").delete().eq("user_id", userId).select()
        if (error) {
          console.error("Supabase config: Error clearing all notifications:", error)
          return { success: false, error: error.message }
        }
        console.log("Supabase config: All notifications cleared successfully:", data)
        return { success: true, data }
      } catch (err) {
        console.error("Supabase config: Exception in clearAllNotifications:", err)
        return { success: false, error: err.message }
      }
    },

    // ===== CUSTOMER FUNCTIONS =====

    // Fungsi untuk mendapatkan data customer
    getCustomers: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching customers from database...")
        const { data, error } = await client.from("customers").select("*").order("created_at", { ascending: false })
        console.log("Supabase config: Customers query result:", { data, error })
        return { success: !error, data: data || [], error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getCustomers:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk menyimpan data customer baru
    saveCustomer: async (customerData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log("Supabase config: Saving customer data:", customerData)
        const { data, error } = await client.from("customers").insert([customerData]).select()
        if (!error && data) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Customer Baru Ditambahkan",
            `Customer baru "${customerData.customer_name}" telah ditambahkan oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "customer_created",
          )
        }
        console.log("Supabase config: Save customer result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in saveCustomer:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan customer berdasarkan nama
    getCustomerByName: async (customerName) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log("Supabase config: Getting customer by name:", customerName)
        const { data, error } = await client
          .from("customers")
          .select("*")
          .ilike("customer_name", `%${customerName}%`)
          .single()
        console.log("Supabase config: Get customer by name result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getCustomerByName:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk memperbarui data customer
    updateCustomer: async (id, updatedData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log("Supabase config: Updating customer:", { id, updatedData })
        const { data, error } = await client.from("customers").update(updatedData).eq("id", id).select()
        if (!error && data) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Data Customer Diperbarui",
            `Data customer "${updatedData.customer_name || "Unknown"}" telah diperbarui oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "customer_updated",
          )
        }
        console.log("Supabase config: Update customer result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in updateCustomer:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk menghapus data customer
    deleteCustomer: async (id) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        console.log("Supabase config: Deleting customer:", id)
        const { error } = await client.from("customers").delete().eq("id", id)
        if (!error) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Customer Dihapus",
            `Data customer telah dihapus oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "customer_deleted",
          )
        }
        console.log("Supabase config: Delete customer result:", { error })
        return { success: !error, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in deleteCustomer:", err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan data item (barang)
    getItems: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching items from database...")
        const { data, error } = await client.from("items").select("*").order("created_at", { ascending: false })
        console.log("Supabase config: Items query result:", { data, error })
        return { success: !error, data: data || [], error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getItems:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk menyimpan data item baru
    saveItem: async (itemData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log("Supabase config: Saving item data:", itemData)
        const { data, error } = await client.from("items").insert([itemData]).select()
        if (!error && data) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Barang Baru Ditambahkan",
            `Barang baru "${itemData.part_assy_name}" telah ditambahkan oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "item_created",
          )
        }
        console.log("Supabase config: Save item result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in saveItem:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan item berdasarkan nama
    getItemByName: async (itemName) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log("Supabase config: Getting item by name:", itemName)
        const { data, error } = await client.from("items").select("*").ilike("part_assy_name", `%${itemName}%`).single()
        console.log("Supabase config: Get item by name result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getItemByName:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk memperbarui data item
    updateItem: async (id, updatedData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log("Supabase config: Updating item:", { id, updatedData })
        const { data, error } = await client.from("items").update(updatedData).eq("id", id).select()
        if (!error && data) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Data Barang Diperbarui",
            `Data barang "${updatedData.part_assy_name || "Unknown"}" telah diperbarui oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "item_updated",
          )
        }
        console.log("Supabase config: Update item result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in updateItem:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk menghapus data item
    deleteItem: async (id) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        console.log("Supabase config: Deleting item:", id)
        const { error } = await client.from("items").delete().eq("id", id)
        if (!error) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Barang Dihapus",
            `Data barang telah dihapus oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "item_deleted",
          )
        }
        console.log("Supabase config: Delete item result:", { error })
        return { success: !error, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in deleteItem:", err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan item berdasarkan part_assy_name
    getItemByPartAssyName: async (partAssyName) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log("Supabase config: Getting item by part_assy_name:", partAssyName)
        const { data, error } = await client.from("items").select("*").eq("part_assy_name", partAssyName).single()
        console.log("Supabase config: Get item by part_assy_name result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getItemByPartAssyName:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan data mesin
    getMachines: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching machines from database...")
        const { data, error } = await client.from("machines").select("*").order("created_at", { ascending: false })
        console.log("Supabase config: Machines query result:", { data, error })
        return { success: !error, data: data || [], error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getMachines:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan data operator
    getOperators: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching operators from database...")
        const { data, error } = await client.from("operators").select("*").order("created_at", { ascending: false })
        console.log("Supabase config: Operators query result:", { data, error })
        return { success: !error, data: data || [], error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getOperators:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan daftar unik nama operator dari tabel 'operators'
    getDistinctOperators: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching distinct operators from 'operators' table...")
        const { data, error } = await client.from("operators").select("operator_name").distinct("operator_name")
        if (error) {
          console.error("Supabase config: Error getting distinct operators:", error)
          return { success: false, data: [], error: error.message }
        }
        const operators = data ? data.map((row) => row.operator_name).filter(Boolean) : []
        console.log("Supabase config: Distinct operators:", operators)
        return { success: true, data: operators }
      } catch (err) {
        console.error("Supabase config: Exception in getDistinctOperators:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan daftar unik mesin dari tabel 'machines'
    getDistinctMachines: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching distinct machines from 'machines' table...")
        const { data, error } = await client.from("machines").select("machine_name").distinct("machine_name")
        if (error) {
          console.error("Supabase config: Error getting distinct machines:", error)
          return { success: false, data: [], error: error.message }
        }
        const machines = data ? data.map((row) => row.machine_name).filter(Boolean) : []
        console.log("Supabase config: Distinct machines:", machines)
        return { success: true, data: machines }
      } catch (err) {
        console.error("Supabase config: Exception in getDistinctMachines:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan daftar unik QC Line dari data produksi
    getDistinctQCLines: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching distinct QC Lines from 'production_data' table...")
        const { data, error } = await client.from("production_data").select("qc_line").distinct("qc_line")
        if (error) {
          console.error("Supabase config: Error getting distinct QC Lines:", error)
          return { success: false, data: [], error: error.message }
        }
        const qcLines = data ? data.map((row) => row.qc_line).filter(Boolean) : []
        console.log("Supabase config: Distinct QC Lines:", qcLines)
        return { success: true, data: qcLines }
      } catch (err) {
        console.error("Supabase config: Exception in getDistinctQCLines:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan daftar unik Part Assy dari data produksi
    getDistinctPartAssy: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching distinct Part Assy from 'production_data' table...")
        const { data, error } = await client.from("production_data").select("part_assy").distinct("part_assy")
        if (error) {
          console.error("Supabase config: Error getting distinct Part Assy:", error)
          return { success: false, data: [], error: error.message }
        }
        const partAssys = data ? data.map((row) => row.part_assy).filter(Boolean) : []
        console.log("Supabase config: Distinct Part Assy:", partAssys)
        return { success: true, data: partAssys }
      } catch (err) {
        console.error("Supabase config: Exception in getDistinctPartAssy:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan daftar unik Part Name dari data produksi
    getDistinctPartName: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching distinct Part Name from 'production_data' table...")
        const { data, error } = await client.from("production_data").select("part_name").distinct("part_name")
        if (error) {
          console.error("Supabase config: Error getting distinct Part Name:", error)
          return { success: false, data: [], error: error.message }
        }
        const partNames = data ? data.map((row) => row.part_name).filter(Boolean) : []
        console.log("Supabase config: Distinct Part Name:", partNames)
        return { success: true, data: partNames }
      } catch (err) {
        console.error("Supabase config: Exception in getDistinctPartName:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan daftar unik Process dari data produksi
    getDistinctProcess: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching distinct Process from 'production_data' table...")
        const { data, error } = await client.from("production_data").select("process").distinct("process")
        if (error) {
          console.error("Supabase config: Error getting distinct Process:", error)
          return { success: false, data: [], error: error.message }
        }
        const processes = data ? data.map((row) => row.process).filter(Boolean) : []
        console.log("Supabase config: Distinct Process:", processes)
        return { success: true, data: processes }
      } catch (err) {
        console.error("Supabase config: Exception in getDistinctProcess:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan Part Name dan Process berdasarkan Part Assy
    getPartDetailsByPartAssy: async (partAssy) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, part_name: null, process: null, error: "Supabase client not ready." }

        console.log("Supabase config: Fetching Part Name and Process by Part Assy:", partAssy)
        const { data, error } = await client
          .from("production_data")
          .select("part_name, process")
          .eq("part_assy", partAssy)
          .limit(1)
        if (error) {
          console.error("Supabase config: Error fetching Part Name and Process by Part Assy:", error)
          return { success: false, part_name: null, process: null, error: error.message }
        }
        const partDetails = data.length > 0 ? data[0] : { part_name: null, process: null }
        console.log("Supabase config: Part Name and Process by Part Assy:", partDetails)
        return { success: true, ...partDetails }
      } catch (err) {
        console.error("Supabase config: Exception in getPartDetailsByPartAssy:", err)
        return { success: false, part_name: null, process: null, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan data sales dari tabel profiles dengan role 'Sales'
    getSales: async () => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching sales profiles from database...")
        // Mengambil id dan display_name dari tabel profiles di mana role adalah 'Sales'
        const { data, error } = await client
          .from("profiles")
          .select("id, display_name")
          .eq("role", "Sales")
          .order("display_name", { ascending: true }) // Urutkan berdasarkan display_name
        console.log("Supabase config: Sales profiles query result:", { data, error })
        return { success: !error, data: data || [], error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getSales:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk mendapatkan data PO
    getPOs: async (startDate = null, endDate = null, createdByUserId = null, salesName = null) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching POs from database...", {
          startDate,
          endDate,
          createdByUserId,
          salesName,
        })
        let query = client.from("purchase_orders").select("*")
        if (startDate && endDate) {
          query = query.gte("po_date", startDate).lte("po_date", endDate)
        }
        if (createdByUserId) {
          query = query.eq("created_by_user_id", createdByUserId)
        }
        if (salesName) {
          // Filter berdasarkan nama sales (display_name)
          query = query.ilike("sales_name", `%${salesName}%`)
        }
        const { data, error } = await query.order("po_date", { ascending: false })
        console.log("Supabase config: POs query result:", { data, error })
        return { success: !error, data: data || [], error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getPOs:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk menyimpan data PO baru
    savePO: async (poData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        const currentUser = await window.DatabaseHelper.getCurrentUser()
        const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)

        const dataToInsert = {
          ...poData,
          created_by_user_id: currentUser?.id,
          created_by_user_display_name: currentProfile?.display_name || currentUser?.email,
        }

        console.log("Supabase config: Saving PO data:", dataToInsert)
        const { data, error } = await client.from("purchase_orders").insert([dataToInsert]).select()
        if (!error && data) {
          // Send notification to directors
          await window.DatabaseHelper.notifyDirectors(
            "PO Baru Ditambahkan",
            `Purchase Order baru "${poData.no_po}" telah ditambahkan oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "po_created",
          )
        }
        console.log("Supabase config: Save PO result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in savePO:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk memperbarui data PO
    updatePO: async (id, updatedData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        const currentUser = await window.DatabaseHelper.getCurrentUser()
        const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)

        const dataToUpdate = {
          ...updatedData,
          // Optionally update created_by fields on update, or keep original
          // For this case, we'll keep the original creator.
          // created_by_user_id: currentUser?.id,
          // created_by_user_display_name: currentProfile?.display_name || currentUser?.email,
        }

        console.log("Supabase config: Updating PO:", { id, dataToUpdate })
        const { data, error } = await client.from("purchase_orders").update(dataToUpdate).eq("id", id).select()
        if (!error && data) {
          // Send notification to directors
          await window.DatabaseHelper.notifyDirectors(
            "Data PO Diperbarui",
            `Data Purchase Order "${updatedData.no_po || "Unknown"}" telah diperbarui oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "po_updated",
          )
        }
        console.log("Supabase config: Update PO result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in updatePO:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk menghapus data PO
    deletePO: async (id) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        console.log("Supabase config: Deleting PO:", id)
        const { error } = await client.from("purchase_orders").delete().eq("id", id)
        if (!error) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "PO Dihapus",
            `Data Purchase Order telah dihapus oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "po_deleted",
          )
        }
        console.log("Supabase config: Delete PO result:", { error })
        return { success: !error, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in deletePO:", err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk mendapatkan data produksi
    getProductionData: async (filters = {}) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: [], error: "Supabase client not ready." }

        console.log("Supabase config: Fetching production data...", filters)
        let query = client
          .from("production_data") // Menggunakan 'production_data' sesuai skema asli
          .select(
            "id, tanggal, nama_operator, shift, jenis_proses, part_name, process, mesin, start_time, finish_time, break_menit, duration, ok, ng, qc_line, note",
          )
          .order("tanggal", { ascending: false })

        if (filters.dateFrom) {
          query = query.gte("tanggal", filters.dateFrom)
        }
        if (filters.dateTo) {
          query = query.lte("tanggal", filters.dateTo)
        }
        if (filters.processType) {
          query = query.eq("jenis_proses", filters.processType)
        }
        if (filters.shift) {
          query = query.eq("shift", filters.shift)
        }

        const { data, error } = await query
        console.log("Supabase config: Production data query result:", { data, error })
        return { success: !error, data: data || [], error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in getProductionData:", err)
        return { success: false, data: [], error: err.message }
      }
    },

    // Fungsi untuk menyimpan data produksi
    saveProductionData: async (productionData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        // Map incoming form data to database schema
        const dataToInsert = {
          tanggal: productionData.tanggal,
          nama_operator: productionData.nama_operator,
          shift: productionData.shift,
          jenis_proses: productionData.jenis_proses,
          part_name: productionData.part_name,
          process: productionData.process,
          mesin: productionData.mesin,
          start_time: productionData.start_time,
          finish_time: productionData.finish_time,
          break_menit: productionData.break_menit,
          duration: productionData.duration,
          ok: productionData.ok,
          ng: productionData.ng,
          qc_line: productionData.qc_line,
          note: productionData.note, // Added the note field here
        }

        console.log("Supabase config: Saving production data:", dataToInsert)
        const { data, error } = await client.from("production_data").insert([dataToInsert]).select()
        if (!error && data) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Data Produksi Baru",
            `Data produksi baru telah ditambahkan oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "production_created",
          )
        }
        console.log("Supabase config: Save production data result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in saveProductionData:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk memperbarui data produksi
    updateProductionData: async (id, updatedData) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, data: null, error: "Supabase client not ready." }

        console.log("Supabase config: Updating production data:", { id, updatedData })
        const { data, error } = await client.from("production_data").update(updatedData).eq("id", id).select()
        if (!error && data) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Data Produksi Diperbarui",
            `Data produksi telah diperbarui oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "production_updated",
          )
        }
        console.log("Supabase config: Update production data result:", { data, error })
        return { success: !error, data, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in updateProductionData:", err)
        return { success: false, data: null, error: err.message }
      }
    },

    // Fungsi untuk menghapus data produksi
    deleteProductionData: async (id) => {
      try {
        const client = window.DatabaseHelper._getSupabaseClient()
        if (!client) return { success: false, error: "Supabase client not ready." }

        console.log("Supabase config: Deleting production data:", id)
        const { error } = await client.from("production_data").delete().eq("id", id)
        if (!error) {
          // Send notification to directors
          const currentUser = await window.DatabaseHelper.getCurrentUser()
          const currentProfile = await window.DatabaseHelper.getUserProfile(currentUser?.id)
          await window.DatabaseHelper.notifyDirectors(
            "Data Produksi Dihapus",
            `Data produksi telah dihapus oleh ${currentProfile?.display_name || currentUser?.email} pada ${new Date().toLocaleString("id-ID")}`,
            "production_deleted",
          )
        }
        console.log("Supabase config: Delete production data result:", { error })
        return { success: !error, error: error ? error.message : null }
      } catch (err) {
        console.error("Supabase config: Exception in deleteProductionData:", err)
        return { success: false, error: err.message }
      }
    },

    // Fungsi untuk cek apakah user sudah login
    checkAuthStatus: async () => {
      try {
        const session = await window.DatabaseHelper.getCurrentSession()
        return !!session
      } catch (err) {
        return false
      }
    },
  }

  console.log("Supabase configuration script started.")
})()
