import { createClient } from "@supabase/supabase-js"

// Pastikan Anda telah mengatur variabel lingkungan ini
// Misalnya, di file .env:
//SUPABASE_URL="https://ovcioxruafodalhtkuyo.supabase.co"
//SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Y2lveHJ1YWZvZGFsaHRrdXlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMzUwMDAsImV4cCI6MjA2ODgxMTAwMH0.eJIsraPIA0JfyUBMqNaHuHlG3zH_ImzZ3jS-Mjq7VtE"

const supabaseUrl = "https://ovcioxruafodalhtkuyo.supabase.co"
const supabaseServiceRoleKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92Y2lveHJ1YWZvZGFsaHRrdXlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzIzNTAwMCwiZXhwIjoyMDY4ODExMDAwfQ.wCuuCJRLDWmUrpgEt_5GuUFvbI7dR_NY6CF8qTIP3c0"

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createUsersAndAssignRoles() {
  const usersToCreate = [
    { email: "direktur@example.com", password: "password123", role: "Direktur" },
    { email: "marketing@example.com", password: "password123", role: "Marketing" },
    { email: "produksi@example.com", password: "password123", role: "Produksi" },
    { email: "sales@example.com", password: "password123", role: "Sales" }, // New Sales user
  ]

  for (const user of usersToCreate) {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Set to true to bypass email confirmation for testing
      })

      if (authError) {
        if (authError.message.includes("User already registered")) {
          console.warn(`User ${user.email} already exists. Skipping creation.`)
          // If user exists, try to get their ID to update profile
          const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.getUserByEmail(user.email)
          if (fetchError) {
            console.error(`Error fetching existing user ${user.email}:`, fetchError.message)
            continue
          }
          authData.user = existingUser.user
        } else {
          console.error(`Error creating user ${user.email}:`, authError.message)
          continue
        }
      }

      const userId = authData.user.id

      // Insert or update profile with role
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, role: user.role, display_name: user.email.split("@")[0] }, { onConflict: "id" }) // Use upsert to handle existing profiles, add display_name

      if (profileError) {
        console.error(`Error assigning role to ${user.email}:`, profileError.message)
      } else {
        console.log(`Successfully created/updated user ${user.email} with role: ${user.role}`)
      }
    } catch (error) {
      console.error(`An unexpected error occurred for ${user.email}:`, error.message)
    }
  }
}

createUsersAndAssignRoles()
