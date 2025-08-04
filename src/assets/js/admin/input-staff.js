document.addEventListener('DOMContentLoaded', () => {
  // Pastikan Supabase dan Typeahead sudah termuat
  if (typeof supabase === 'undefined') {
    console.error('Supabase client is not loaded.');
    return;
  }
  if (typeof $ === 'undefined' || typeof $.fn.typeahead === 'undefined') {
    console.error('jQuery or Typeahead.js is not loaded.');
    return;
  }

  // Fungsi untuk mengambil data role dari tabel 'roles' di Supabase
  async function getRoles() {
    try {
      const { data, error } = await supabase.from('roles').select('role_name');
      if (error) {
        throw error;
      }
      return data.map(role => role.role_name);
    } catch (error) {
      console.error('Error fetching roles:', error);
      showNotification('Gagal memuat daftar role.', false);
      return [];
    }
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

  // Jalankan inisialisasi
  initializeRoleTypeahead();

  // Menangani proses submit form
  const form = document.getElementById('inputStaffForm');
  if (form) {
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
        // Langkah 1: Panggil fungsi Supabase untuk mendaftarkan user baru
        const { data: signUpData, error: signUpError } = await supabase.rpc('create_new_user', {
            p_email: email,
            p_password: password,
            p_display_name: displayName,
            p_role: role
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }
        
        showNotification('Staff baru berhasil dibuat!', true);
        form.reset();
        $('#role').typeahead('val', ''); // Membersihkan input typeahead
        
      } catch (error) {
        console.error('Error saat membuat staff:', error);
        showNotification(error.message, false);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
      }
    });
  }
});

// Pastikan fungsi notifikasi tersedia secara global jika belum
function showNotification(message, isSuccess = true) {
  let notification = document.getElementById('customNotification');
  if (!notification) {
    // Buat elemen notifikasi jika tidak ada
    const notificationHTML = `
      <div id="customNotification" style="position: fixed; top: 20px; right: 20px; z-index: 1050; display: none;">
        <div class="toast-body"></div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
    notification = document.getElementById('customNotification');
  }
  
  const toastBody = notification.querySelector('.toast-body') || notification;
  toastBody.textContent = message;
  
  // Hapus kelas sebelumnya dan tambahkan yang baru
  notification.classList.remove('bg-success', 'bg-danger', 'text-white');
  if(isSuccess) {
    notification.classList.add('bg-success', 'text-white');
  } else {
    notification.classList.add('bg-danger', 'text-white');
  }
  
  // Tampilkan notifikasi
  notification.style.display = 'block';
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}
