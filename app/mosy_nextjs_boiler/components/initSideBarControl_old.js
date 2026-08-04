export default function initSidebarControl() {
  const toggleBtn = document.getElementById('toggle_btn');
  const mobileBtn = document.getElementById('mobile_btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';

  let lastOpenedSubmenu = null;

  // Helper to slide down
  function slideDown(el) {
    el.style.display = 'block';
    el.style.height = '0px';
    const height = el.scrollHeight + 'px';
    requestAnimationFrame(() => {
      el.style.transition = 'height 0.3s ease';
      el.style.height = height;
    });
    el.addEventListener('transitionend', function handler() {
      el.style.height = '';
      el.removeEventListener('transitionend', handler);
    });
  }

  // Helper to slide up
  function slideUp(el) {
    el.style.height = el.scrollHeight + 'px';
    requestAnimationFrame(() => {
      el.style.transition = 'height 0.3s ease';
      el.style.height = '0px';
    });
    el.addEventListener('transitionend', function handler() {
      el.style.display = 'none';
      el.style.height = '';
      el.removeEventListener('transitionend', handler);
    });
  }

  // Replace jQuery toggle_btn handler
  toggleBtn?.addEventListener('click', function (e) {
    e.preventDefault();
    const container = document.querySelector('.dashboard-container');
    const isMini = container.classList.contains('mini-sidebar');
    container.classList.toggle('mini-sidebar');

    const submenus = document.querySelectorAll('.subdrop + ul');
    submenus.forEach((ul) => {
      if (isMini) {
        slideDown(ul);
      } else {
        slideUp(ul);
      }
    });
  });

  // Mobile Menu
  mobileBtn?.addEventListener('click', function () {
    document.body.classList.add('slide-nav');
    document.body.appendChild(overlay);
    overlay.style.display = 'block';
  });

  overlay.addEventListener('click', function () {
    document.body.classList.remove('slide-nav');
    overlay.style.display = 'none';
    document.body.removeChild(overlay);
  });


// Hover-to-expand Mini Sidebar
const dashboardContainer = document.querySelector('.dashboard-container');
const sidebarEl = document.getElementById('sidebar');
  
sidebarEl?.addEventListener('mouseenter', function () {
  if (dashboardContainer.classList.contains('mini-sidebar')) {
    dashboardContainer.classList.add('expand-menu');

    if (lastOpenedSubmenu) {
      //lastOpenedSubmenu.style.display = 'block'; // 👀 Make it visible
      
      lastOpenedSubmenu.style.opacity = '0';
      lastOpenedSubmenu.style.transition = 'opacity 2s';
      lastOpenedSubmenu.style.display = 'block';
      requestAnimationFrame(() => {
        lastOpenedSubmenu.style.opacity = '1';
      });

      
      
      
    }
  }
});

sidebarEl?.addEventListener('mouseleave', function () {
  if (dashboardContainer.classList.contains('mini-sidebar')) {
    dashboardContainer.classList.remove('expand-menu');

    if (lastOpenedSubmenu) {
      lastOpenedSubmenu.style.display = 'none'; // 🚫 Hide ghost submenu
    }
  }
});



  // Submenu Toggle
  const submenuItems = document.querySelectorAll('.submenu > a');
submenuItems.forEach((item) => {
  item.addEventListener('click', function (e) {
    e.preventDefault();
    const submenu = item.nextElementSibling;
    const parent = item.parentElement;
    const isOpen = parent.classList.contains('subdrop');

    submenuItems.forEach((el) => {
      el.parentElement?.classList.remove('subdrop');
      const subUl = el.nextElementSibling;
      if (subUl && subUl.style.display !== 'none') {
        slideUp(subUl);
      }
    });

    if (!isOpen && submenu) {
      parent.classList.add('subdrop');
      slideDown(submenu);
      lastOpenedSubmenu = submenu; // 🧠 Track it
    } else {
      lastOpenedSubmenu = null;
    }
  });
});

// User Dropdown Toggle
const userDropdownTrigger = document.querySelector('.nav-item.dropdown.has-arrow > a');
const userDropdownMenu = document.querySelector('.nav-item.dropdown.has-arrow .dropdown-menu');

if (userDropdownTrigger && userDropdownMenu) {
  userDropdownTrigger.addEventListener('click', function (e) {
    e.preventDefault();
    const parent = this.closest('.dropdown');

    if (parent.classList.contains('show')) {
      parent.classList.remove('show');
      userDropdownMenu.classList.remove('show');
    } else {
      // Close any other open dropdowns
      document.querySelectorAll('.nav-item.dropdown.has-arrow').forEach((el) => {
        el.classList.remove('show');
        const menu = el.querySelector('.dropdown-menu');
        if (menu) menu.classList.remove('show');
      });

      parent.classList.add('show');
      userDropdownMenu.classList.add('show');
    }
  });

  // Close dropdown on outside click
  document.addEventListener('click', function (e) {
    if (!userDropdownTrigger.contains(e.target) && !userDropdownMenu.contains(e.target)) {
      document.querySelectorAll('.nav-item.dropdown.has-arrow').forEach((el) => {
        el.classList.remove('show');
        const menu = el.querySelector('.dropdown-menu');
        if (menu) menu.classList.remove('show');
      });
    }
  });
}



}
