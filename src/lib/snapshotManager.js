const activeSnapshots = [];

export const addSnapshot = (unsubscribe) => {
  activeSnapshots.push(unsubscribe);
  return unsubscribe;
};

export const removeSnapshot = (unsubscribe) => {
  const index = activeSnapshots.indexOf(unsubscribe);
  if (index > -1) {
    activeSnapshots.splice(index, 1);
  }
};

export const clearAllSnapshots = () => {
  activeSnapshots.forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      try {
        unsubscribe();
      } catch (e) {
        console.error('Error unsubscribing snapshot:', e);
      }
    }
  });
  activeSnapshots.length = 0;
};