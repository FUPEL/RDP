;(() => {
  document.addEventListener("DOMContentLoaded", async () => {
    console.log("Input Staff: DOM Content Loaded.")

    // Ensure DatabaseHelper is available
    if (typeof window.DatabaseHelper === "undefined") {
      console.error("Input Staff: DatabaseHelper is not defined. Supabase functions will not work.")
      return
    }

    const emailInput = document.getElementById("email")
    const passwordInput = document.getElementById("password")
    const displayNameInput = document.getElementById("displayName")
    const roleInput = document.getElementById("role")
    const inputStaffForm = document.getElementById("inputStaffForm")

    // Declare Bloodhound and $ variables
    const Bloodhound = window.Bloodhound
    const $ = window.jQuery

    // --- Role Typeahead/Autosuggestion ---
    const setupRoleTypeahead = async () => {
      const result = await window.DatabaseHelper.getDistinctRoles()
      if (result.success) {
        const roles = result.data
        console.log("Input Staff: Fetched distinct roles for typeahead:", roles)

        const rolesBloodhound = new Bloodhound({
          datumTokenizer: Bloodhound.tokenizers.whitespace,
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          local: roles,
        })

        roleInput.setAttribute("autocomplete", "off") // Disable browser autocomplete

        $(roleInput).typeahead(
          {
            hint: true,
            highlight: true,
            minLength: 0, // Show suggestions immediately
          },
          {
            name: "roles",
            source: rolesBloodhound,
            limit: 10, // Limit the number of suggestions
          },
        )

        // Handle selection to ensure the input value is correctly set
        $(roleInput).bind("typeahead:select", (ev, suggestion) => {
          roleInput.value = suggestion
          console.log("Input Staff: Role selected:", suggestion)
        })

        // Handle blur to ensure the input value is correctly set if not selected from dropdown
        $(roleInput).bind("blur", () => {
          if (!roles.includes(roleInput.value) && roleInput.value !== "") {
            // Optional: if you want to force selection from list or clear invalid input
            // roleInput.value = '';
            console.warn("Input Staff: Role entered is not in the suggested list:", roleInput.value)
          }
        })
      } else {
        console.error("Input Staff: Failed to load distinct roles:", result.error)
      }
    }

    // Initialize Typeahead
    setupRoleTypeahead()

    // --- Form Submission ---
    inputStaffForm.addEventListener("submit", async (e) => {
      e.preventDefault()

      const email = emailInput.value.trim()
      const password = passwordInput.value
      const displayName = displayNameInput.value.trim()
      const role = roleInput.value.trim()

      if (!email || !password || !displayName || !role) {
        alert("Harap lengkapi semua kolom.")
        return
      }

      // 1. Sign up new user in Supabase Auth
      const { data: authData, error: authError } = await window.DatabaseHelper.signUpNewUser(email, password)

      if (authError) {
        console.error("Input Staff: Error signing up user:", authError)
        alert(`Gagal mendaftarkan pengguna: ${authError.message || authError.toString()}`)
        return
      }

      const userId = authData.user?.id

      if (!userId) {
        alert("Gagal mendapatkan ID pengguna setelah pendaftaran.")
        return
      }

      console.log("Input Staff: User signed up successfully with ID:", userId)

      // 2. Create profile in 'profiles' table
      const { success: profileSuccess, error: profileError } = await window.DatabaseHelper.createProfile(
        userId,
        displayName,
        role,
      )

      if (!profileSuccess) {
        console.error("Input Staff: Error creating user profile:", profileError)
        alert(`Gagal membuat profil pengguna: ${profileError}`)
        // Optional: If profile creation fails, you might want to delete the user from auth
        // await window.DatabaseHelper._getSupabaseClient().auth.admin.deleteUser(userId);
        return
      }

      console.log("Input Staff: User profile created successfully.")
      alert("Staff baru berhasil ditambahkan!")

      // Clear form
      inputStaffForm.reset()
      $(roleInput).typeahead("val", "") // Clear typeahead input
      setupRoleTypeahead() // Re-initialize typeahead to refresh suggestions if needed
    })
  })
})()
