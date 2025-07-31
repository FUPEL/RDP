// Role-based menu management
;(() => {
  // Global instance for external access
  window.roleBasedMenuInstance = null

  // Wait for DOM and DatabaseHelper to be ready
  function initRoleBasedMenu() {
    // Check if DatabaseHelper is available and its Supabase client is initialized
    if (typeof window.DatabaseHelper === "undefined" || !window.DatabaseHelper._getSupabaseClient()) {
      console.log("Role-based menu: DatabaseHelper or Supabase client not ready, retrying...")
      setTimeout(initRoleBasedMenu, 100) // Reduced delay for faster retry
      return
    }

    console.log("Role-based menu: Initializing role-based menu...")
    checkAuthAndSetupMenu()
  }

  async function checkAuthAndSetupMenu() {
    try {
      // Ensure DatabaseHelper is ready before calling its methods
      if (typeof window.DatabaseHelper === "undefined" || !window.DatabaseHelper._getSupabaseClient()) {
        console.log("Role-based menu: DatabaseHelper or Supabase client not ready during auth check, retrying...")
        setTimeout(checkAuthAndSetupMenu, 100) // Retry
        return
      }

      const session = await window.DatabaseHelper.getCurrentSession()
      console.log("Role-based menu: Current session:", session)

      if (!session || !session.user) {
        console.log("Role-based menu: No valid session found, redirecting to login...")
        // Only redirect if we're not already on login page
        if (!window.location.pathname.includes("login-v1.html")) {
          window.location.href = "../pages/login-v1.html"
        }
        return
      }

      console.log("Role-based menu: Valid session found for user:", session.user.email, "User ID:", session.user.id)

      // Get user profile (role + display_name)
      const userProfile = await window.DatabaseHelper.getUserProfile(session.user.id)
      console.log("Role-based menu: Fetched user profile:", userProfile)

      if (!userProfile) {
        console.error("Role-based menu: User profile not found for ID:", session.user.id, "Redirecting to login.")
        window.location.href = "../pages/login-v1.html"
        return
      }
      console.log("Role-based menu: User profile:", userProfile)

      const userRole = userProfile?.role || "user"
      console.log("Role-based menu: User role detected:", userRole)

      // Setup menu based on role
      setupMenuForRole(userRole)

      // Setup user profile display in header
      setupUserProfileDisplay(session.user, userProfile)

      // Setup notifications for Direktur role
      if (userRole === "Direktur") {
        const notificationManager = await setupNotifications(session.user.id)

        // Create global instance
        window.roleBasedMenuInstance = {
          refreshNotifications: () => notificationManager.loadNotifications(session.user.id),
          userId: session.user.id,
          userRole: userRole,
        }
      } else {
        hideNotifications()

        // Create minimal global instance for non-Direktur users
        window.roleBasedMenuInstance = {
          refreshNotifications: () => console.log("Notifications not available for this role"),
          userId: session.user.id,
          userRole: userRole,
        }
      }

      // Setup logout functionality
      setupLogoutButton()
    } catch (error) {
      console.error("Role-based menu: Error in checkAuthAndSetupMenu:", error)
      // Redirect to login on critical error
      if (!window.location.pathname.includes("login-v1.html")) {
        window.location.href = "../pages/login-v1.html"
      }
    }
  }

  function setupMenuForRole(role) {
    console.log("Role-based menu: Setting up menu for role:", role)

    // Get all menu items with data-role attribute
    const menuItems = document.querySelectorAll("[data-role]")
    console.log("Role-based menu: Found menu items:", menuItems.length)

    menuItems.forEach((item, index) => {
      const allowedRoles = item
        .getAttribute("data-role")
        .split(",")
        .map((r) => r.trim())

      let hasAccess = allowedRoles.includes(role) || allowedRoles.includes("all")

      // Special rule: If user is 'Sales', and 'Marketing' is allowed, grant access
      if (role === "Sales" && allowedRoles.includes("Marketing")) {
        hasAccess = true
      }

      console.log(`Role-based menu: Processing menu item [${index}]:`, {
        elementText: item.textContent?.trim().split("\n")[0],
        allowedRoles: allowedRoles,
        userRole: role,
        hasAccess: hasAccess,
      })

      if (hasAccess) {
        item.style.display = ""
        item.classList.remove("hidden")
        console.log(`Role-based menu: ✅ Showing menu item: ${item.textContent?.trim().split("\n")[0]}`)

        // Handle notification dropdown specifically
        if (item.classList.contains("notification-dropdown")) {
          const dropdownToggle = item.querySelector('[data-pc-toggle="dropdown"]')
          const dropdownMenu = item.querySelector(".dropdown-menu")

          if (dropdownToggle && dropdownMenu) {
            // Ensure dropdown is completely hidden initially
            item.classList.remove("drp-show")
            dropdownMenu.classList.remove("show")
            dropdownMenu.style.display = "none"
            dropdownMenu.style.visibility = "hidden"
            dropdownMenu.style.opacity = "0"
            dropdownToggle.setAttribute("aria-expanded", "false")

            console.log("Role-based menu: ✅ Notification dropdown properly hidden on initialization")
          }
        }
      } else {
        item.style.display = "none"
        item.classList.add("hidden")
        console.log(`Role-based menu: ❌ Hiding menu item: ${item.textContent?.trim().split("\n")[0]}`)
      }
    })

    // Also check for page-level access
    const currentPage = window.location.pathname
    const pageElement = document.querySelector("[data-page-role]")

    if (pageElement) {
      const allowedRoles = pageElement
        .getAttribute("data-page-role")
        .split(",")
        .map((r) => r.trim())

      // Grant Direktur role full access to any page
      if (role === "Direktur") {
        console.log("Role-based menu: ✅ Direktur role has full access to this page.")
        return // Direktur always has access, bypass further checks
      }

      let hasPageAccess = allowedRoles.includes(role) || allowedRoles.includes("all")

      // Special rule: If user is 'Sales', and 'Marketing' is allowed, grant access
      if (role === "Sales" && allowedRoles.includes("Marketing")) {
        hasPageAccess = true
      }

      console.log("Role-based menu: Page access check:", {
        currentPage: currentPage,
        allowedRoles: allowedRoles,
        userRole: role,
        hasAccess: hasPageAccess,
      })

      if (!hasPageAccess) {
        console.log("Role-based menu: ❌ User does not have access to this page")
        showAccessDenied()
        return
      }
    }

    // Force refresh feather icons after menu changes
    setTimeout(() => {
      const feather = window.feather
      if (typeof feather !== "undefined") {
        feather.replace()
      }
    }, 100)
  }

  function setupUserProfileDisplay(user, profile) {
    console.log("Role-based menu: Setting up user profile display:", { user, profile })

    // Update profile display in header
    const profileNameElement = document.querySelector(".dropdown-header h6")
    const profileEmailElement = document.querySelector(".dropdown-header span")

    if (profileNameElement && profile?.display_name) {
      profileNameElement.textContent = profile.display_name + " 🖖"
    }

    if (profileEmailElement && user?.email) {
      profileEmailElement.textContent = user.email
    }

    // Also update any other profile displays if they exist
    const otherProfileElements = document.querySelectorAll("[data-user-name]")
    otherProfileElements.forEach((element) => {
      if (profile?.display_name) {
        element.textContent = profile.display_name
      }
    })

    const otherEmailElements = document.querySelectorAll("[data-user-email]")
    otherEmailElements.forEach((element) => {
      if (user?.email) {
        element.textContent = user.email
      }
    })
  }

  async function setupNotifications(userId) {
    console.log("Role-based menu: Setting up notifications for user:", userId)

    const notificationManager = {
      userId: userId,

      async loadNotifications(userId) {
        try {
          console.log("Role-based menu: Loading notifications for user:", userId)

          // Get unread count
          const countResult = await window.DatabaseHelper.getUnreadNotificationCount(userId)
          const unreadCount = countResult.success ? countResult.count : 0

          console.log("Role-based menu: Unread notification count:", unreadCount)

          // Update badge
          this.updateNotificationBadge(unreadCount)

          // Get recent notifications
          const notificationsResult = await window.DatabaseHelper.getUserNotifications(userId, 20)
          if (notificationsResult.success) {
            console.log("Role-based menu: Loaded notifications:", notificationsResult.data.length)
            this.displayNotifications(notificationsResult.data)
          } else {
            console.error("Role-based menu: Failed to load notifications:", notificationsResult.error)
            this.showEmptyState("Gagal memuat notifikasi")
          }
        } catch (error) {
          console.error("Role-based menu: Error loading notifications:", error)
          this.showEmptyState("Terjadi kesalahan saat memuat notifikasi")
        }
      },

      updateNotificationBadge(count) {
        const badge = document.querySelector(".notification-badge")
        if (badge) {
          if (count > 0) {
            badge.textContent = count > 99 ? "99+" : count.toString()
            badge.style.display = "flex"

            // Add pulse animation for new notifications
            badge.style.animation = "pulse 2s infinite"

            // Remove animation after 5 seconds
            setTimeout(() => {
              badge.style.animation = "none"
            }, 5000)
          } else {
            badge.style.display = "none"
            badge.style.animation = "none"
          }
        }
      },

      displayNotifications(notifications) {
        const notificationBody = document.querySelector(".notification-body")
        if (!notificationBody) return

        if (notifications.length === 0) {
          this.showEmptyState("Tidak ada notifikasi")
          return
        }

        // Group notifications by date
        const groupedNotifications = this.groupNotificationsByDate(notifications)

        let html = ""

        // Generate HTML for each date group
        Object.keys(groupedNotifications).forEach((dateKey) => {
          const dateLabel = this.getDateLabel(dateKey)
          const notifs = groupedNotifications[dateKey]

          html += `<div class="notification-date-separator">${dateLabel}</div>`

          notifs.forEach((notification) => {
            html += this.createNotificationHTML(notification)
          })
        })

        notificationBody.innerHTML = html

        // Refresh feather icons
        if (typeof window.feather !== "undefined") {
          window.feather.replace()
        }

        // Add click handlers for individual notifications
        this.setupNotificationItemHandlers()

        console.log("Role-based menu: ✅ Notifications displayed successfully")
      },

      groupNotificationsByDate(notifications) {
        const groups = {}
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()

        notifications.forEach((notification) => {
          const notifDate = new Date(notification.created_at).toDateString()
          let dateKey

          if (notifDate === today) {
            dateKey = "today"
          } else if (notifDate === yesterday) {
            dateKey = "yesterday"
          } else {
            dateKey = notifDate
          }

          if (!groups[dateKey]) {
            groups[dateKey] = []
          }
          groups[dateKey].push(notification)
        })

        return groups
      },

      getDateLabel(dateKey) {
        if (dateKey === "today") return "Hari Ini"
        if (dateKey === "yesterday") return "Kemarin"

        const date = new Date(dateKey)
        return date.toLocaleDateString("id-ID", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      },

      createNotificationHTML(notification) {
        const createdAt = new Date(notification.created_at)
        const timeAgo = this.getTimeAgo(createdAt)
        const isRead = notification.is_read
        const avatar = this.getNotificationAvatar(notification)
        const icon = this.getNotificationIcon(notification.activity_type)

        return `
          <div class="notification-item ${isRead ? "read" : ""}"
               data-notification-id="${notification.id}">
            ${!isRead ? '<div class="unread-dot"></div>' : ""}

            <div class="d-flex align-items-start gap-3">
              <!-- Avatar/Icon -->
              <div class="notification-avatar ${avatar.bgColor}">
                <i data-feather="${icon}" style="width: 20px; height: 20px; color: ${avatar.iconColor};"></i>
              </div>

              <!-- Content -->
              <div class="notification-content">
                <div class="d-flex align-items-start justify-content-between">
                  <div class="notification-title">${notification.title}</div>
                  <div class="notification-time">${timeAgo}</div>
                </div>

                <div class="notification-description">${notification.message}</div>

                <!-- Meta Info -->
                <div class="notification-meta">
                  <i data-feather="clock" style="width: 12px; height: 12px;"></i>
                  <span>${createdAt.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span>
                </div>
              </div>
            </div>
          </div>
        `
      },

      getNotificationAvatar(notification) {
        // Color-coded avatars based on activity type
        const activityType = notification.activity_type

        const avatarMap = {
          po_created: { bgColor: "bg-primary bg-opacity-10", iconColor: "#0d6efd" },
          item_created: { bgColor: "bg-success bg-opacity-10", iconColor: "#198754" },
          customer_created: { bgColor: "bg-info bg-opacity-10", iconColor: "#0dcaf0" },
          production_created: { bgColor: "bg-warning bg-opacity-10", iconColor: "#ffc107" },
          customer_updated: { bgColor: "bg-secondary bg-opacity-10", iconColor: "#6c757d" },
          item_updated: { bgColor: "bg-secondary bg-opacity-10", iconColor: "#6c757d" },
          po_updated: { bgColor: "bg-secondary bg-opacity-10", iconColor: "#6c757d" },
          production_updated: { bgColor: "bg-secondary bg-opacity-10", iconColor: "#6c757d" },
          customer_deleted: { bgColor: "bg-danger bg-opacity-10", iconColor: "#dc3545" },
          item_deleted: { bgColor: "bg-danger bg-opacity-10", iconColor: "#dc3545" },
          po_deleted: { bgColor: "bg-danger bg-opacity-10", iconColor: "#dc3545" },
          production_deleted: { bgColor: "bg-danger bg-opacity-10", iconColor: "#dc3545" },
        }

        return avatarMap[activityType] || { bgColor: "bg-primary bg-opacity-10", iconColor: "#0d6efd" }
      },

      getNotificationIcon(activityType) {
        const iconMap = {
          po_created: "file-plus",
          item_created: "package",
          customer_created: "user-plus",
          production_created: "settings",
          customer_updated: "user-check",
          item_updated: "edit",
          po_updated: "edit-3",
          production_updated: "settings",
          customer_deleted: "user-minus",
          item_deleted: "trash-2",
          po_deleted: "file-minus",
          production_deleted: "x-circle",
        }
        return iconMap[activityType] || "bell"
      },

      getTimeAgo(date) {
        const now = new Date()
        const diffInSeconds = Math.floor((now - date) / 1000)

        if (diffInSeconds < 60) return `${diffInSeconds} detik lalu`
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit lalu`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari lalu`

        return date.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        })
      },

      showEmptyState(message) {
        const notificationBody = document.querySelector(".notification-body")
        if (!notificationBody) return

        notificationBody.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">
              <i data-feather="bell-off" style="width: 32px; height: 32px;"></i>
            </div>
            <p class="text-muted mb-0">${message}</p>
          </div>
        `

        // Refresh feather icons
        if (typeof window.feather !== "undefined") {
          window.feather.replace()
        }
      },

      setupNotificationItemHandlers() {
        const notificationItems = document.querySelectorAll(".notification-item")

        notificationItems.forEach((item) => {
          item.addEventListener("click", async (e) => {
            e.stopPropagation()

            const notificationId = item.dataset.notificationId
            if (notificationId && !item.classList.contains("read")) {
              try {
                await window.DatabaseHelper.markNotificationAsRead(notificationId)
                item.classList.add("read")

                // Remove unread dot
                const unreadDot = item.querySelector(".unread-dot")
                if (unreadDot) {
                  unreadDot.remove()
                }

                // Refresh notification count
                const session = await window.DatabaseHelper.getCurrentSession()
                if (session?.user) {
                  const countResult = await window.DatabaseHelper.getUnreadNotificationCount(session.user.id)
                  const unreadCount = countResult.success ? countResult.count : 0
                  this.updateNotificationBadge(unreadCount)
                }
              } catch (error) {
                console.error("Role-based menu: Error marking notification as read:", error)
              }
            }
          })
        })
      },
    }

    try {
      // Show notification dropdown (this is handled by setupMenuForRole now, but keeping for context)
      const notificationDropdown = document.querySelector('.notification-dropdown[data-role="Direktur"]')
      if (notificationDropdown) {
        notificationDropdown.style.display = ""
        notificationDropdown.classList.remove("hidden")
      }

      // Setup notification scroll behavior
      setupNotificationScroll()

      // Setup notification handlers
      setupNotificationHandlers(userId, notificationManager)

      // Load and display notifications
      await notificationManager.loadNotifications(userId)

      // Set up periodic refresh of notifications (reduced frequency since we have real-time)
      setInterval(() => notificationManager.loadNotifications(userId), 60000) // Every 60 seconds

      console.log("Role-based menu: ✅ Notifications setup completed")

      return notificationManager
    } catch (error) {
      console.error("Role-based menu: Error setting up notifications:", error)
      return notificationManager
    }
  }

  function hideNotifications() {
    console.log("Role-based menu: Hiding notifications for non-Direktur user")

    const notificationDropdown = document.querySelector('.notification-dropdown[data-role="Direktur"]')
    if (notificationDropdown) {
      notificationDropdown.style.display = "none"
      notificationDropdown.classList.add("hidden")
    }
  }

  function setupNotificationScroll() {
    const notificationBody = document.querySelector(".notification-body")
    const notificationDropdownMenu = document.querySelector(".dropdown-notification")

    if (notificationBody) {
      // Prevent dropdown from closing when scrolling within the notification list
      notificationBody.addEventListener("wheel", (e) => {
        e.stopPropagation()
      })
    }

    if (notificationDropdownMenu) {
      // Prevent dropdown from closing when clicking anywhere inside the dropdown menu content
      notificationDropdownMenu.addEventListener("click", (e) => {
        e.stopPropagation()
      })
    }

    console.log("Role-based menu: ✅ Notification scroll behavior setup completed")
  }

  function setupNotificationHandlers(userId, notificationManager) {
    // Mark all as read button
    const markAllReadBtn = document.querySelector(".mark-all-read-btn")
    if (markAllReadBtn) {
      markAllReadBtn.addEventListener("click", async (e) => {
        e.preventDefault()
        e.stopPropagation()

        try {
          await window.DatabaseHelper.markAllNotificationsAsRead(userId)
          await notificationManager.loadNotifications(userId)
          console.log("Role-based menu: ✅ All notifications marked as read")
        } catch (error) {
          console.error("Role-based menu: Error marking all notifications as read:", error)
        }
      })
    }

    // Clear all notifications button
    const clearAllBtn = document.querySelector(".clear-all-btn")
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", async (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (confirm("Apakah Anda yakin ingin menghapus semua notifikasi?")) {
          try {
            await window.DatabaseHelper.clearAllNotifications(userId)
            await notificationManager.loadNotifications(userId)
            console.log("Role-based menu: ✅ All notifications cleared")
          } catch (error) {
            console.error("Role-based menu: Error clearing notifications:", error)
          }
        }
      })
    }
  }

  function setupLogoutButton() {
    const logoutButtons = document.querySelectorAll("[data-logout], #logoutButton")

    logoutButtons.forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.preventDefault()

        try {
          console.log("Role-based menu: Logging out user...")
          await window.DatabaseHelper.signOut()

          // Clear any stored data
          localStorage.removeItem("rememberMe")
          sessionStorage.clear()

          // Stop real-time notifications
          if (window.NotificationRealTime) {
            window.NotificationRealTime.stop()
          }

          // Redirect to login
          window.location.href = "../pages/login-v1.html"
        } catch (error) {
          console.error("Role-based menu: Logout error:", error)
          // Force redirect even if logout fails
          window.location.href = "../pages/login-v1.html"
        }
      })
    })
  }

  function showAccessDenied() {
    document.body.innerHTML = `
    <div class="flex items-center justify-center min-h-screen bg-gray-100">
      <div class="text-center">
        <h1 class="text-4xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p class="text-gray-600 mb-4">You don't have permission to access this page.</p>
        <button onclick="window.history.back()" class="btn btn-primary">Go Back</button>
      </div>
    </div>
  `
  }

  // Function to show/hide menu items based on user role
  function showMenuItemsByRole(userRole) {
    console.log("Role-based menu: Setting menu visibility for role:", userRole)

    // Get all menu items with data-menu-role attribute
    const menuItems = document.querySelectorAll("[data-menu-role]")

    menuItems.forEach((item) => {
      const allowedRoles = item
        .getAttribute("data-menu-role")
        .split(",")
        .map((role) => role.trim())

      let hasAccess = allowedRoles.includes(userRole) || allowedRoles.includes("all")

      // Special rule: If user is 'Sales', and 'Marketing' is allowed, grant access
      if (userRole === "Sales" && allowedRoles.includes("Marketing")) {
        hasAccess = true
      }

      if (hasAccess) {
        item.style.display = ""
        console.log("Role-based menu: Showing menu item for roles:", allowedRoles)
      } else {
        item.style.display = "none"
        console.log("Role-based menu: Hiding menu item for roles:", allowedRoles)
      }
    })
  }

  // Function to show/hide page content based on user role
  function showPageContentByRole(userRole) {
    console.log("Role-based menu: Setting page content visibility for role:", userRole)

    // Get all page content elements with data-page-role attribute
    const pageElements = document.querySelectorAll("[data-page-role]")

    pageElements.forEach((element) => {
      const allowedRoles = element
        .getAttribute("data-page-role")
        .split(",")
        .map((role) => role.trim())

      let hasPageAccess = allowedRoles.includes(userRole) || allowedRoles.includes("all")

      // Special rule: If user is 'Sales', and 'Marketing' is allowed, grant access
      if (userRole === "Sales" && allowedRoles.includes("Marketing")) {
        hasPageAccess = true
      }

      if (hasPageAccess) {
        element.style.display = ""
        console.log("Role-based menu: Showing page content for roles:", allowedRoles)
      } else {
        element.style.display = "none"
        console.log("Role-based menu: Hiding page content for roles:", allowedRoles)

        // Show access denied message
        const accessDeniedMessage = document.createElement("div")
        accessDeniedMessage.className = "alert alert-warning"
        accessDeniedMessage.innerHTML =
          "<strong>Akses Ditolak:</strong> Anda tidak memiliki izin untuk mengakses halaman ini."
        element.parentNode.insertBefore(accessDeniedMessage, element)
      }
    })
  }

  // Initialize when DOM is loaded
  document.addEventListener("DOMContentLoaded", () => {
    console.log("Role-based menu: DOM loaded, checking authentication...")

    // Skip auth check for login page
    if (window.location.pathname.includes("login-v1.html")) {
      console.log("Role-based menu: On login page, skipping auth check.")
      return
    }

    initRoleBasedMenu()
  })

  console.log("Role-based menu script loaded.")
})()
