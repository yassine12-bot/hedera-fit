// balance-loader.js
// Script pour charger et mettre à jour le balance automatiquement

const API_URL = 'http://localhost:3000';

/**
 * Charger le balance depuis le serveur
 */
async function loadUserBalance() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;

    // ✅ Récupérer les données fraîches du serveur
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      const userData = result.data;
      
      // ✅ Mettre à jour le localStorage
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...currentUser,
        id: userData.id,
        name: userData.name,
        email: userData.email,
        fitBalance: userData.fitBalance || 0,
        totalSteps: userData.totalSteps || 0,
        badgeCount: userData.badgeCount || 0
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // ✅ Mettre à jour l'affichage
      updateBalanceDisplay(updatedUser.fitBalance);
      
      return updatedUser;
    } else if (response.status === 401) {
      // Token invalide, déconnecter
      localStorage.clear();
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('Erreur chargement balance:', error);
    // En cas d'erreur, utiliser le localStorage comme fallback
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    updateBalanceDisplay(user.fitBalance || 0);
    return user;
  }
}

/**
 * Mettre à jour l'affichage du balance dans la page
 */
function updateBalanceDisplay(balance) {
  // Cherche tous les éléments possibles qui affichent le balance
  const balanceElements = [
    document.getElementById('balance'),
    document.getElementById('fit-balance'),
    document.getElementById('user-balance'),
    document.querySelector('.balance'),
    document.querySelector('[data-balance]')
  ];
  
  balanceElements.forEach(el => {
    if (el) {
      // Si c'est une class "balance" ou id "balance", ajoute " FIT"
      if (el.classList.contains('balance') || el.id === 'balance') {
        el.textContent = `${balance} FIT`;
      } else {
        el.textContent = balance;
      }
    }
  });
}

/**
 * Mettre à jour le balance après une transaction (achat/sync)
 */
function updateBalanceAfterTransaction(newBalance) {
  // Mettre à jour localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  user.fitBalance = newBalance;
  localStorage.setItem('user', JSON.stringify(user));
  
  // Mettre à jour l'affichage
  updateBalanceDisplay(newBalance);
}

// ✅ Charger automatiquement au chargement de la page
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Petit délai pour laisser la page se charger
    setTimeout(loadUserBalance, 100);
  });
} else {
  // Si la page est déjà chargée
  setTimeout(loadUserBalance, 100);
}