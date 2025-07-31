document.addEventListener('DOMContentLoaded', () => {
  // Pastikan semua library yang dibutuhkan sudah termuat
  if (typeof $ === 'undefined' || typeof $.fn.typeahead === 'undefined') {
    console.error('jQuery atau Typeahead.js belum termuat.');
    return;
  }
  if (typeof supabase === 'undefined') {
    console.error('Supabase client belum termuat.');
    return;
  }

  // Fungsi untuk mengambil data role dari Supabase
  async function getRoles() {
    const { data, error } = await supabase.from('roles').select('role_name');
    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    return data.map(role => role.role_name);
  }

  // Inisialisasi Typeahead untuk input role
  async function initializeRoleTypeahead() {
    const roleNames = await getRoles();
    
    const roles = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.whitespace,
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      local: roleNames
    });

    $('#role').typeahead({
      hint: true,
      highlight: true,
      minLength: 0
    }, {
      name: 'roles',
      source: roles,
      limit: 10
    });
  }

  // Menjalankan inisialisasi
  initializeRoleTypeahead();

  // Menangani proses submit form
  const form = document.getElementById('inputStaffForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const displayName = document.getElementById('displayName').value;
    const role = document.getElementById('role').value;

    try {
      // Langkah 1: Daftarkan user baru di Supabase Authentication
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (authData.user) {
        // Langkah 2: Perbarui tabel 'profiles' dengan display name dan role
        // Trigger di Supabase seharusnya sudah membuat baris baru di 'profiles' saat user terdaftar
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            display_name: displayName,
            role: role,
            email: email
          })
          .eq('id', authData.user.id);

        if (profileError) {
          throw new Error(`Gagal memperbarui profil: ${profileError.message}`);
        }

        showNotification('Staff baru berhasil dibuat!', true);
        form.reset();
        $('#role').typeahead('val', ''); // Membersihkan input typeahead
      } else {
        throw new Error('Gagal membuat user, tidak ada data yang dikembalikan.');
      }
    } catch (error) {
      console.error('Error saat membuat staff:', error);
      showNotification(error.message, false);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit';
    }
  });
});
