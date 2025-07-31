// Notification Helper - Global notification system for all roles
;(() => {
  // Global notification helper
  window.NotificationHelper = {
    // Create notification for any activity
    async createNotification(activityType, title, message, targetUserId = null) {
      try {
        console.log("NotificationHelper: Creating notification:", { activityType, title, message, targetUserId })

        const currentUserInfo = await this.getCurrentUserInfo() // Get current user info
        const createdByUserId = currentUserInfo?.id || null // Get the ID of the user creating the notification

        // If no target user specified, send to all Direktur users
        if (!targetUserId) {
          const direkturUsers = await this.getDirektorUsers()
          if (direkturUsers.length > 0) {
            for (const user of direkturUsers) {
              const insertResult = await this.insertNotification(
                user.user_id,
                activityType,
                title,
                message,
                createdByUserId,
              )
              console.log(`NotificationHelper: Insert result for user ${user.user_id}:`, insertResult)
            }
            console.log(`NotificationHelper: ✅ Notification sent to ${direkturUsers.length} Direktur users`)
          } else {
            console.warn("NotificationHelper: No Direktur users found")
          }
        } else {
          const insertResult = await this.insertNotification(
            targetUserId,
            activityType,
            title,
            message,
            createdByUserId,
          )
          console.log(`NotificationHelper: Insert result for target user ${targetUserId}:`, insertResult)
        }

        // Trigger real-time update
        this.triggerRealTimeUpdate()

        console.log("NotificationHelper: ✅ Notification created successfully")
        return { success: true }
      } catch (error) {
        console.error("NotificationHelper: Error creating notification:", error)
        return { success: false, error: error.message }
      }
    },

    // Get all Direktur users
    async getDirektorUsers() {
      try {
        if (!window.DatabaseHelper || !window.DatabaseHelper._getSupabaseClient()) {
          console.error("NotificationHelper: DatabaseHelper not available")
          return []
        }

        const supabase = window.DatabaseHelper._getSupabaseClient()
        const { data, error } = await supabase
          .from("user_profiles") // Assuming 'user_profiles' is the correct table for roles
          .select("user_id, display_name, role")
          .eq("role", "Direktur")

        if (error) {
          console.error("NotificationHelper: Error fetching Direktur users:", error)
          return []
        }

        console.log("NotificationHelper: Found Direktur users:", data?.length || 0)
        return data || []
      } catch (error) {
        console.error("NotificationHelper: Error in getDirektorUsers:", error)
        return []
      }
    },

    // Insert notification to database
    async insertNotification(userId, activityType, title, message, createdByUserId) {
      // Added createdByUserId parameter
      try {
        if (!window.DatabaseHelper || !window.DatabaseHelper._getSupabaseClient()) {
          throw new Error("DatabaseHelper not available")
        }

        const supabase = window.DatabaseHelper._getSupabaseClient()
        const { data, error } = await supabase.from("notifications").insert([
          {
            user_id: userId,
            activity_type: activityType,
            title: title,
            message: message,
            is_read: false,
            created_at: new Date().toISOString(),
            created_by: createdByUserId, // Added created_by field
          },
        ])

        if (error) {
          throw error
        }

        console.log("NotificationHelper: ✅ Notification inserted for user:", userId)
        return { success: true, data }
      } catch (error) {
        console.error("NotificationHelper: Error inserting notification:", error)
        throw error
      }
    },

    // Trigger notification for common activities
    async triggerActivityNotification(activityType, entityName, actionBy = null) {
      // Get current user info if actionBy not provided
      if (!actionBy) {
        const userInfo = await this.getCurrentUserInfo()
        actionBy = userInfo?.displayName || userInfo?.email || "System"
      }

      const notifications = {
        po_created: {
          title: "PO Baru Dibuat",
          message: `Purchase Order "${entityName}" telah dibuat oleh ${actionBy}.`,
        },
        item_created: {
          title: "Barang Baru Ditambahkan",
          message: `Barang "${entityName}" telah ditambahkan ke sistem oleh ${actionBy}.`,
        },
        customer_created: {
          title: "Customer Baru Ditambahkan",
          message: `Customer "${entityName}" telah ditambahkan ke sistem oleh ${actionBy}.`,
        },
        production_created: {
          title: "Produksi Baru Dibuat",
          message: `Data produksi "${entityName}" telah dibuat oleh ${actionBy}.`,
        },
        customer_updated: {
          title: "Data Customer Diperbarui",
          message: `Data customer "${entityName}" telah diperbarui oleh ${actionBy}.`,
        },
        item_updated: {
          title: "Data Barang Diperbarui",
          message: `Data barang "${entityName}" telah diperbarui oleh ${actionBy}.`,
        },
        po_updated: {
          title: "PO Diperbarui",
          message: `Purchase Order "${entityName}" telah diperbarui oleh ${actionBy}.`,
        },
        production_updated: {
          title: "Data Produksi Diperbarui",
          message: `Data produksi "${entityName}" telah diperbarui oleh ${actionBy}.`,
        },
        customer_deleted: {
          title: "Customer Dihapus",
          message: `Customer "${entityName}" telah dihapus dari sistem oleh ${actionBy}.`,
        },
        item_deleted: {
          title: "Barang Dihapus",
          message: `Barang "${entityName}" telah dihapus dari sistem oleh ${actionBy}.`,
        },
        po_deleted: {
          title: "PO Dihapus",
          message: `Purchase Order "${entityName}" telah dihapus oleh ${actionBy}.`,
        },
        production_deleted: {
          title: "Data Produksi Dihapus",
          message: `Data produksi "${entityName}" telah dihapus oleh ${actionBy}.`,
        },
      }

      const notification = notifications[activityType]
      if (notification) {
        return await this.createNotification(activityType, notification.title, notification.message)
      } else {
        console.warn("NotificationHelper: Unknown activity type:", activityType)
        return { success: false, error: "Unknown activity type" }
      }
    },

    // Get current user info for notifications
    async getCurrentUserInfo() {
      try {
        if (!window.DatabaseHelper) {
          return null
        }

        const session = await window.DatabaseHelper.getCurrentSession()
        if (!session?.user) {
          return null
        }

        const profile = await window.DatabaseHelper.getUserProfile(session.user.id)
        return {
          id: session.user.id,
          email: session.user.email,
          displayName: profile?.display_name || session.user.email,
          role: profile?.role || "user",
        }
      } catch (error) {
        console.error("NotificationHelper: Error getting current user info:", error)
        return null
      }
    },

    // Trigger real-time update
    triggerRealTimeUpdate() {
      // Dispatch custom event for real-time updates
      window.dispatchEvent(
        new CustomEvent("notificationUpdate", {
          detail: { timestamp: Date.now() },
        }),
      )

      // Also broadcast to other tabs
      window.NotificationRealTime.broadcastUpdate()
    },
  }

  // Real-time notification system
  window.NotificationRealTime = {
    isActive: false,
    refreshInterval: null,
    lastUpdateTime: 0,
    supabaseSubscription: null,

    // Start real-time updates
    async start() {
      if (this.isActive) return

      this.isActive = true
      console.log("NotificationRealTime: ✅ Started")

      // Listen for custom notification events
      window.addEventListener("notificationUpdate", this.handleUpdate.bind(this))

      // Set up Supabase real-time subscription
      await this.setupSupabaseRealTime()

      // Set up periodic refresh (fallback)
      this.refreshInterval = setInterval(() => {
        this.forceRefresh()
      }, 30000) // Every 30 seconds as fallback
    },

    // Setup Supabase real-time subscription
    async setupSupabaseRealTime() {
      try {
        if (!window.DatabaseHelper || !window.DatabaseHelper._getSupabaseClient()) {
          console.warn("NotificationRealTime: DatabaseHelper not available for real-time setup")
          return
        }

        const supabase = window.DatabaseHelper._getSupabaseClient()
        const currentUser = await window.DatabaseHelper.getCurrentUser()

        if (!currentUser) {
          console.warn("NotificationRealTime: No current user for real-time setup")
          return
        }

        // Subscribe to notifications table changes for current user
        this.supabaseSubscription = supabase
          .channel("notifications-channel")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${currentUser.id}`,
            },
            (payload) => {
              console.log("NotificationRealTime: New notification received:", payload)
              this.handleNewNotification(payload.new)
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${currentUser.id}`,
            },
            (payload) => {
              console.log("NotificationRealTime: Notification updated:", payload)
              this.forceRefresh()
            },
          )
          .subscribe((status) => {
            console.log("NotificationRealTime: Subscription status:", status)
          })

        console.log("NotificationRealTime: ✅ Supabase real-time subscription setup completed")
      } catch (error) {
        console.error("NotificationRealTime: Error setting up Supabase real-time:", error)
      }
    },

    // Handle new notification from real-time subscription
    handleNewNotification(notification) {
      console.log("NotificationRealTime: Processing new notification:", notification)

      // Force refresh notifications immediately
      this.forceRefresh()

      // Show browser notification if permission granted
      this.showBrowserNotification(notification)
    },

    // Show browser notification
    showBrowserNotification(notification) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: "/favicon.ico", // Adjust path as needed
          tag: `notification-${notification.id}`,
          requireInteraction: false,
        })
      }
    },

    // Request notification permission
    async requestNotificationPermission() {
      if ("Notification" in window && Notification.permission === "default") {
        const permission = await Notification.requestPermission()
        console.log("NotificationRealTime: Browser notification permission:", permission)
        return permission === "granted"
      }
      return Notification.permission === "granted"
    },

    // Stop real-time updates
    stop() {
      if (!this.isActive) return

      this.isActive = false
      console.log("NotificationRealTime: Stopped")

      window.removeEventListener("notificationUpdate", this.handleUpdate.bind(this))

      // Unsubscribe from Supabase real-time
      if (this.supabaseSubscription) {
        this.supabaseSubscription.unsubscribe()
        this.supabaseSubscription = null
        console.log("NotificationRealTime: Supabase subscription unsubscribed")
      }

      if (this.refreshInterval) {
        clearInterval(this.refreshInterval)
        this.refreshInterval = null
      }
    },

    // Handle notification update
    handleUpdate(event) {
      console.log("NotificationRealTime: Update triggered", event.detail)

      // Debounce updates (max once per 1 second for real-time)
      const now = Date.now()
      if (now - this.lastUpdateTime < 1000) {
        return
      }
      this.lastUpdateTime = now

      // Refresh notifications immediately for real-time feel
      this.forceRefresh()
    },

    // Force refresh notifications
    forceRefresh() {
      console.log("NotificationRealTime: Forcing notification refresh.")
      // Trigger refresh in role-based-menu if available
      if (window.roleBasedMenuInstance && window.roleBasedMenuInstance.refreshNotifications) {
        window.roleBasedMenuInstance.refreshNotifications()
      }
    },

    // Broadcast update to other tabs/windows
    broadcastUpdate() {
      // Use localStorage to communicate between tabs
      localStorage.setItem("notificationUpdate", Date.now().toString())
      localStorage.removeItem("notificationUpdate")
    },
  }

  // Listen for localStorage changes (cross-tab communication)
  window.addEventListener("storage", (e) => {
    if (e.key === "notificationUpdate") {
      window.NotificationRealTime.handleUpdate({ detail: { timestamp: e.newValue } })
    }
  })

  // Auto-initialize when DatabaseHelper is ready
  function initNotificationHelper() {
    if (typeof window.DatabaseHelper !== "undefined" && window.DatabaseHelper._getSupabaseClient()) {
      console.log("NotificationHelper: ✅ Initialized successfully")

      // Start real-time system
      window.NotificationRealTime.start()

      // Request browser notification permission
      window.NotificationRealTime.requestNotificationPermission()

      // Test notification creation (remove in production)
      // window.NotificationHelper.triggerActivityNotification('item_created', 'Test Item', 'System')
    } else {
      setTimeout(initNotificationHelper, 100)
    }
  }

  // Initialize when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    initNotificationHelper()
  })

  console.log("NotificationHelper: Script loaded")
})()
