// Restaurant Management System
class RestaurantManager {
  constructor() {
    this.db = null;
    this.ingredients = [];
    this.dishes = [];
    this.sales = [];
    this.currentSaleItems = [];
    this.cashMovements = [];
    this.currentPeriod = "daily";
    this.isSavingSale = false; // Flag to prevent double submission

    this.init();
  }

  async init() {
    // Wait for Firebase to be available
    await this.waitForFirebase();
    console.log("Firebase connected:", this.db);

    // Test Firebase connection
    await this.testFirebaseConnection();

    this.setupEventListeners();
    await this.loadData();
    this.updateDashboard();

    // Initialize real-time listeners
    this.setupRealtimeListeners();

    // Initialize comandas view if it's the default view
    setTimeout(() => {
      const comandasView = document.getElementById("comandas-view");
      if (comandasView && !comandasView.classList.contains("hidden")) {
        if (window.updateComandasDisplay) {
          window.updateComandasDisplay(this.sales);
        }
      }
    }, 1000);
  }

  // Setup real-time listeners for multi-device synchronization
  setupRealtimeListeners() {
    console.log("Setting up real-time listeners for multi-device sync...");

    // Real-time listener for sales
    this.salesUnsubscribe = window.onSnapshot(
      window.collection(this.db, "sales"),
      (snapshot) => {
        console.log("Real-time sales update received:", snapshot.size, "sales");

        const newSales = [];
        snapshot.forEach((doc) => {
          newSales.push({ id: doc.id, ...doc.data() });
        });

        // Update sales data
        this.sales = newSales;

        // Update all views
        this.loadTodaySales();
        this.updateDashboard();
        this.updateComandasRealTime();

        // Show notification for new sales (but not on initial load)
        if (
          this.sales.length > 0 &&
          this.lastSalesCount !== undefined &&
          this.sales.length > this.lastSalesCount
        ) {
          this.showRealtimeNotification(
            "Nueva venta registrada en otro dispositivo"
          );
        }

        this.lastSalesCount = this.sales.length;
      },
      (error) => {
        console.error("Error in real-time sales listener:", error);
      }
    );

    // Real-time listener for ingredients
    this.ingredientsUnsubscribe = window.onSnapshot(
      window.collection(this.db, "ingredients"),
      (snapshot) => {
        console.log(
          "Real-time ingredients update received:",
          snapshot.size,
          "ingredients"
        );

        const newIngredients = [];
        snapshot.forEach((doc) => {
          newIngredients.push({ id: doc.id, ...doc.data() });
        });

        this.ingredients = newIngredients;
        this.updateDashboard();
      },
      (error) => {
        console.error("Error in real-time ingredients listener:", error);
      }
    );

    // Real-time listener for dishes
    this.dishesUnsubscribe = window.onSnapshot(
      window.collection(this.db, "dishes"),
      (snapshot) => {
        console.log(
          "Real-time dishes update received:",
          snapshot.size,
          "dishes"
        );

        const newDishes = [];
        snapshot.forEach((doc) => {
          newDishes.push({ id: doc.id, ...doc.data() });
        });

        this.dishes = newDishes;
        this.updateDashboard();
      },
      (error) => {
        console.error("Error in real-time dishes listener:", error);
      }
    );

    // Real-time listener for cash movements
    this.cashMovementsUnsubscribe = window.onSnapshot(
      window.collection(this.db, "cashMovements"),
      (snapshot) => {
        console.log(
          "Real-time cash movements update received:",
          snapshot.size,
          "movements"
        );

        const newCashMovements = [];
        snapshot.forEach((doc) => {
          newCashMovements.push({ id: doc.id, ...doc.data() });
        });

        this.cashMovements = newCashMovements;
        this.updateDashboard();
      },
      (error) => {
        console.error("Error in real-time cash movements listener:", error);
      }
    );

    console.log("Real-time listeners setup complete");
  }

  // Show notification for real-time updates from other devices
  showRealtimeNotification(message) {
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse";
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-sync-alt mr-2"></i>
        <span class="font-semibold">${message}</span>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  // Cleanup listeners when needed
  cleanupRealtimeListeners() {
    if (this.salesUnsubscribe) {
      this.salesUnsubscribe();
      console.log("Sales listener unsubscribed");
    }
    if (this.ingredientsUnsubscribe) {
      this.ingredientsUnsubscribe();
      console.log("Ingredients listener unsubscribed");
    }
    if (this.dishesUnsubscribe) {
      this.dishesUnsubscribe();
      console.log("Dishes listener unsubscribed");
    }
    if (this.cashMovementsUnsubscribe) {
      this.cashMovementsUnsubscribe();
      console.log("Cash movements listener unsubscribed");
    }
  }

  async testFirebaseConnection() {
    try {
      console.log("Testing Firebase connection...");
      // Try to read from a collection to test connection
      const testQuery = await window.getDocs(
        window.collection(this.db, "ingredients")
      );
      console.log(
        "Firebase connection test successful. Found",
        testQuery.size,
        "ingredients"
      );
    } catch (error) {
      console.error("Firebase connection test failed:", error);
      this.showMessage(
        "Error de conexión a Firebase: " + error.message,
        "error"
      );
    }
  }

  async waitForFirebase() {
    return new Promise((resolve) => {
      const checkFirebase = () => {
        if (window.db) {
          this.db = window.db;
          resolve();
        } else {
          setTimeout(checkFirebase, 100);
        }
      };
      checkFirebase();
    });
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        const section = e.currentTarget.dataset.section;
        this.showSection(section);
      });
    });

    // Modal controls
    this.setupModalControls();

    // Form submissions
    this.setupFormSubmissions();

    // Button events
    this.setupButtonEvents();
  }

  setupModalControls() {
    // Ingredient modal
    const ingredientModal = document.getElementById("ingredient-modal");
    const addIngredientBtn = document.getElementById("add-ingredient-btn");
    const cancelIngredientBtn = document.getElementById("cancel-ingredient");
    const closeIngredientModal = ingredientModal.querySelector(".close");

    addIngredientBtn.addEventListener("click", () => {
      this.showIngredientModal();
    });

    cancelIngredientBtn.addEventListener("click", () => {
      console.log("Cancel ingredient clicked");
      this.hideModal("ingredient-modal");
    });

    if (closeIngredientModal) {
      closeIngredientModal.addEventListener("click", () => {
        this.hideModal("ingredient-modal");
      });
    }

    // Dish modal
    const dishModal = document.getElementById("dish-modal");
    const addDishBtn = document.getElementById("add-dish-btn");
    const cancelDishBtn = document.getElementById("cancel-dish");
    const closeDishModal = dishModal.querySelector(".close");

    addDishBtn.addEventListener("click", () => {
      this.showDishModal();
    });

    cancelDishBtn.addEventListener("click", () => {
      this.hideModal("dish-modal");
    });

    if (closeDishModal) {
      closeDishModal.addEventListener("click", () => {
        this.hideModal("dish-modal");
      });
    }

    // Close modals when clicking outside
    window.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        this.hideModal(e.target.id);
      }
    });
  }

  setupFormSubmissions() {
    // Ingredient form
    const ingredientForm = document.getElementById("ingredient-form");
    if (ingredientForm) {
      ingredientForm.addEventListener("submit", (e) => {
        e.preventDefault();
        console.log("Ingredient form submitted");
        this.saveIngredient();
      });
    }

    // Also add direct click listener to submit button
    const submitBtn = document.querySelector(
      '#ingredient-form button[type="submit"]'
    );
    if (submitBtn) {
      submitBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("Submit button clicked directly");
        this.saveIngredient();
      });
    }

    // Auto-calculate cost per portion for ingredients
    const priceInput = document.getElementById("ingredient-price");
    const portionsInput = document.getElementById("ingredient-portions");
    const costDisplay = document.getElementById("cost-per-portion");

    if (priceInput && portionsInput && costDisplay) {
      const calculateCost = () => {
        const price = parseFloat(priceInput.value) || 0;
        const portions = parseInt(portionsInput.value) || 1;

        if (price > 0 && portions > 0) {
          const costPerPortion = price / portions;
          costDisplay.value = costPerPortion.toFixed(2);
          costDisplay.textContent = `Bs. ${costPerPortion.toFixed(2)}`;
        } else {
          costDisplay.value = "0.00";
          costDisplay.textContent = "Bs. 0.00";
        }
      };

      // Add event listeners for real-time calculation
      priceInput.addEventListener("input", calculateCost);
      priceInput.addEventListener("change", calculateCost);
      portionsInput.addEventListener("input", calculateCost);
      portionsInput.addEventListener("change", calculateCost);

      // Calculate on page load if values exist
      calculateCost();
    }

    // Dish form
    const dishForm = document.getElementById("dish-form");
    if (dishForm) {
      dishForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveDish();
      });
    }

    // Sale form
    const saleForm = document.getElementById("sale-form");
    if (saleForm) {
      saleForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveSale();
      });
    }

    // Cash movement form
    const cashMovementForm = document.getElementById("cash-movement-form");
    if (cashMovementForm) {
      cashMovementForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveCashMovement();
      });
    }
  }

  setupButtonEvents() {
    // Sales
    const newSaleBtn = document.getElementById("new-sale-btn");
    if (newSaleBtn) {
      newSaleBtn.addEventListener("click", () => {
        this.showSalesForm();
      });
    }

    const cancelSaleBtn = document.getElementById("cancel-sale");
    if (cancelSaleBtn) {
      cancelSaleBtn.addEventListener("click", () => {
        this.hideSalesForm();
      });
    }

    const addDishToSaleBtn = document.getElementById("add-dish-to-sale");
    if (addDishToSaleBtn) {
      addDishToSaleBtn.addEventListener("click", () => {
        this.addDishToSale();
      });
    }

    const saveSaleBtn = document.getElementById("save-sale");
    if (saveSaleBtn) {
      saveSaleBtn.addEventListener("click", () => {
        this.saveSale();
      });
    }

    // Add event listener for dish selection in sales
    const saleDishSelect = document.getElementById("sale-dish");
    if (saleDishSelect) {
      saleDishSelect.addEventListener("change", (e) => {
        const selectedOption = e.target.selectedOptions[0];
        if (selectedOption && selectedOption.dataset.price) {
          const salePriceInput = document.getElementById("sale-price");
          if (salePriceInput) {
            salePriceInput.value = selectedOption.dataset.price;
          }
        }
      });
    }

    // Add ingredient to dish
    const addIngredientToDishBtn = document.getElementById(
      "add-ingredient-to-dish"
    );
    if (addIngredientToDishBtn) {
      addIngredientToDishBtn.addEventListener("click", () => {
        this.addIngredientToDish();
      });
    }

    // Cash Register
    const addCashMovementBtn = document.getElementById("add-cash-movement-btn");
    if (addCashMovementBtn) {
      addCashMovementBtn.addEventListener("click", () => {
        this.showCashMovementForm();
      });
    }

    const cancelCashMovementBtn = document.getElementById(
      "cancel-cash-movement"
    );
    if (cancelCashMovementBtn) {
      cancelCashMovementBtn.addEventListener("click", () => {
        this.hideCashMovementForm();
      });
    }

    // Close button for cash movement modal
    const cashMovementModal = document.getElementById("cash-movement-modal");
    if (cashMovementModal) {
      const closeCashMovementModal = cashMovementModal.querySelector(".close");
      if (closeCashMovementModal) {
        closeCashMovementModal.addEventListener("click", () => {
          this.hideCashMovementForm();
        });
      }
    }

    // Reports
    const generateReportBtn = document.getElementById("generate-report");
    if (generateReportBtn) {
      generateReportBtn.addEventListener("click", () => {
        this.generateReport();
      });
    }

    // Period buttons
    document.querySelectorAll(".period-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        // Update button styles
        document.querySelectorAll(".period-btn").forEach((b) => {
          b.classList.remove("bg-blue-500", "text-white");
          b.classList.add("bg-gray-200", "text-gray-700");
        });
        e.target.classList.remove("bg-gray-200", "text-gray-700");
        e.target.classList.add("bg-blue-500", "text-white");

        // Set current period and regenerate report
        this.currentPeriod = e.target.dataset.period;
        this.generateReport();
      });
    });

    // FAB (Floating Action Button)
    const fab = document.getElementById("quick-action-fab");
    if (fab) {
      fab.addEventListener("click", () => {
        this.showQuickActions();
      });
    }
  }

  showQuickActions() {
    // Show quick action menu based on current section
    const currentSection = document.querySelector(
      ".content-section:not(.hidden)"
    );
    if (!currentSection) return;

    const sectionId = currentSection.id;

    switch (sectionId) {
      case "ingredients":
        this.showIngredientModal();
        break;
      case "dishes":
        this.showDishModal();
        break;
      case "sales":
        this.loadSales().then(() => {
          this.loadTodaySales();
          this.loadDishesForSale();
        });
        break;
      case "cash-register":
        this.showCashMovementForm();
        break;
      default:
        // Show a quick action menu
        this.showQuickActionMenu();
    }
  }

  showQuickActionMenu() {
    // Create a quick action overlay
    const overlay = document.createElement("div");
    overlay.className =
      "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center";
    overlay.innerHTML = `
      <div class="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full">
        <h3 class="text-lg font-semibold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div class="space-y-3">
          <button class="w-full btn-mobile bg-blue-500 text-white" onclick="restaurantManager.showIngredientModal(); this.closest('.fixed').remove();">
            <i class="fas fa-carrot mr-2"></i>Agregar Ingrediente
          </button>
          <button class="w-full btn-mobile bg-purple-500 text-white" onclick="restaurantManager.showDishModal(); this.closest('.fixed').remove();">
            <i class="fas fa-utensils mr-2"></i>Agregar Plato
          </button>
          <button class="w-full btn-mobile bg-green-500 text-white" onclick="restaurantManager.showSalesForm(); this.closest('.fixed').remove();">
            <i class="fas fa-shopping-cart mr-2"></i>Nueva Venta
          </button>
          <button class="w-full btn-mobile bg-orange-500 text-white" onclick="restaurantManager.showCashMovementForm(); this.closest('.fixed').remove();">
            <i class="fas fa-cash-register mr-2"></i>Movimiento de Caja
          </button>
        </div>
        <button class="w-full btn-mobile bg-gray-500 text-white mt-4" onclick="this.closest('.fixed').remove();">
          Cancelar
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  showSection(sectionName) {
    // Update navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
    });
    const activeItem = document.querySelector(
      `[data-section="${sectionName}"]`
    );
    if (activeItem) {
      activeItem.classList.add("active");
    }

    // Update content
    document.querySelectorAll(".content-section").forEach((section) => {
      section.classList.add("hidden");
      section.classList.remove("block");
    });
    const activeSection = document.getElementById(sectionName);
    activeSection.classList.remove("hidden");
    activeSection.classList.add("block");

    // Update page title (if element exists)
    const pageTitleEl = document.getElementById("page-title");
    if (pageTitleEl) {
      const titles = {
        dashboard: "Dashboard",
        ingredients: "Ingredientes",
        dishes: "Platos",
        sales: "Ventas",
        reports: "Reportes",
        "cash-register": "Caja",
      };
      pageTitleEl.textContent = titles[sectionName];
    }

    // Load section-specific data
    switch (sectionName) {
      case "ingredients":
        this.loadIngredients();
        break;
      case "dishes":
        this.loadDishes();
        break;
      case "sales":
        this.loadSales().then(() => {
          this.loadTodaySales();
          this.loadDishesForSale();
        });
        break;
      case "reports":
        this.loadReports();
        break;
      case "cash-register":
        this.loadCashRegister();
        break;
    }
  }

  async loadData() {
    try {
      console.log("Loading initial data...");

      // Load ingredients first, then dishes (dishes need ingredients for cost calculation)
      await this.loadIngredients();
      await this.loadDishes();

      // Load other data in parallel
      await this.loadSales();
      this.updateDashboard();

      console.log(
        "Initial data loaded. Real-time listeners will handle updates."
      );
    } catch (error) {
      console.error("Error loading data:", error);
      this.showMessage("Error al cargar los datos", "error");
    }
  }

  // Ingredients Management
  async loadIngredients() {
    try {
      console.log("Loading ingredients...");
      const querySnapshot = await window.getDocs(
        window.collection(this.db, "ingredients")
      );
      this.ingredients = [];
      querySnapshot.forEach((doc) => {
        this.ingredients.push({ id: doc.id, ...doc.data() });
      });
      console.log("Ingredients loaded:", this.ingredients.length);
      this.renderIngredients();
    } catch (error) {
      console.error("Error loading ingredients:", error);
      this.showMessage(
        "Error al cargar ingredientes: " + error.message,
        "error"
      );
    }
  }

  renderIngredients() {
    const container = document.getElementById("ingredients-list");
    if (!container) return;

    if (this.ingredients.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-carrot text-4xl text-gray-300 mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-600 mb-2">No hay ingredientes</h3>
          <p class="text-gray-500">Agrega tu primer ingrediente para comenzar</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.ingredients
      .map(
        (ingredient) => `
            <div class="bg-white/95 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:-translate-y-1 transition-all duration-300">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">${
                      ingredient.name
                    }</h3>
                    <div class="flex gap-2">
                        <button class="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors" onclick="restaurantManager.editIngredient('${
                          ingredient.id
                        }')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors" onclick="restaurantManager.deleteIngredient('${
                          ingredient.id
                        }')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="space-y-2 text-gray-600">
                    <p><span class="font-semibold">Precio Total:</span> Bs. ${ingredient.price.toFixed(
                      2
                    )}</p>
                    <p><span class="font-semibold">Porciones que Rinde:</span> ${
                      ingredient.portions
                    }</p>
                    <p><span class="font-semibold">Costo por Porción:</span> Bs. ${(
                      ingredient.costPerPortion ||
                      ingredient.price / ingredient.portions
                    ).toFixed(2)}</p>
                    <p><span class="font-semibold">Disponible:</span> ${
                      ingredient.remaining || ingredient.portions
                    } porciones</p>
                </div>
            </div>
        `
      )
      .join("");
  }

  showIngredientModal(ingredient = null) {
    const modal = document.getElementById("ingredient-modal");
    const form = document.getElementById("ingredient-form");

    if (!modal || !form) return;

    if (ingredient) {
      const nameInput = document.getElementById("ingredient-name");
      const priceInput = document.getElementById("ingredient-price");
      const portionsInput = document.getElementById("ingredient-portions");

      if (nameInput) nameInput.value = ingredient.name;
      if (priceInput) priceInput.value = ingredient.price;
      if (portionsInput) portionsInput.value = ingredient.portions;

      form.dataset.ingredientId = ingredient.id;
    } else {
      form.reset();
      delete form.dataset.ingredientId;
    }

    // Recalculate cost per portion
    const priceInput = document.getElementById("ingredient-price");
    const portionsInput = document.getElementById("ingredient-portions");
    const costDisplay = document.getElementById("cost-per-portion");

    if (priceInput && portionsInput && costDisplay) {
      const price = parseFloat(priceInput.value) || 0;
      const portions = parseInt(portionsInput.value) || 1;

      if (price > 0 && portions > 0) {
        const costPerPortion = price / portions;
        costDisplay.value = costPerPortion.toFixed(2);
        costDisplay.textContent = `Bs. ${costPerPortion.toFixed(2)}`;
      } else {
        costDisplay.value = "0.00";
        costDisplay.textContent = "Bs. 0.00";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("block");
    // Prevent body scroll
    document.body.style.overflow = "hidden";

    // Ensure calculation runs after modal is shown
    setTimeout(() => {
      const priceInput = document.getElementById("ingredient-price");
      const portionsInput = document.getElementById("ingredient-portions");
      const costDisplay = document.getElementById("cost-per-portion");

      if (priceInput && portionsInput && costDisplay) {
        const price = parseFloat(priceInput.value) || 0;
        const portions = parseInt(portionsInput.value) || 1;

        if (price > 0 && portions > 0) {
          const costPerPortion = price / portions;
          costDisplay.value = costPerPortion.toFixed(2);
        } else {
          costDisplay.value = "0.00";
        }
      }
    }, 100);
  }

  hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("block");
      // Restore body scroll
      document.body.style.overflow = "auto";

      // Clean up dish modal state
      if (modalId === "dish-modal") {
        const form = document.getElementById("dish-form");
        if (form) {
          form.reset();
          delete form.dataset.dishId;
          const ingredientsContainer =
            document.getElementById("dish-ingredients");
          if (ingredientsContainer) {
            ingredientsContainer.innerHTML = `
              <div class="text-center py-6 text-gray-500">
                <i class="fas fa-utensils text-2xl mb-2"></i>
                <p class="text-sm">No hay ingredientes agregados</p>
                <p class="text-xs">Selecciona ingredientes para comenzar</p>
              </div>
            `;
          }
        }
      }
    }
  }

  async saveIngredient() {
    console.log("saveIngredient function called");
    const form = document.getElementById("ingredient-form");
    const price = parseFloat(document.getElementById("ingredient-price").value);
    const portions = parseInt(
      document.getElementById("ingredient-portions").value
    );

    const formData = {
      name: document.getElementById("ingredient-name").value,
      price: price,
      portions: portions,
      costPerPortion: price / portions, // Calculado automáticamente
      remaining: portions, // Porciones disponibles
      createdAt: new Date(),
    };

    console.log("Saving ingredient:", formData);
    console.log("Firebase db:", this.db);

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    submitBtn.disabled = true;

    try {
      if (form.dataset.ingredientId) {
        // Update existing ingredient
        console.log("Updating ingredient with ID:", form.dataset.ingredientId);
        await window.updateDoc(
          window.doc(this.db, "ingredients", form.dataset.ingredientId),
          formData
        );
        this.showMessage("Ingrediente actualizado correctamente", "success");
      } else {
        // Add new ingredient
        console.log("Adding new ingredient to collection");
        const docRef = await window.addDoc(
          window.collection(this.db, "ingredients"),
          formData
        );
        console.log("Document written with ID: ", docRef.id);
        this.showMessage("Ingrediente agregado correctamente", "success");
      }

      this.hideModal("ingredient-modal");
      await this.loadIngredients();

      // Update all dishes that use this ingredient
      await this.updateDishesWithIngredient(formData.name);

      this.updateDashboard();
    } catch (error) {
      console.error("Error saving ingredient:", error);
      this.showMessage(
        "Error al guardar el ingrediente: " + error.message,
        "error"
      );
    } finally {
      // Restore button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  editIngredient(id) {
    const ingredient = this.ingredients.find((ing) => ing.id === id);
    if (ingredient) {
      this.showIngredientModal(ingredient);
    }
  }

  async deleteIngredient(id) {
    if (confirm("¿Estás seguro de que quieres eliminar este ingrediente?")) {
      try {
        await window.deleteDoc(window.doc(this.db, "ingredients", id));
        this.showMessage("Ingrediente eliminado correctamente", "success");
        this.loadIngredients();
        this.updateDashboard();
      } catch (error) {
        console.error("Error deleting ingredient:", error);
        this.showMessage("Error al eliminar el ingrediente", "error");
      }
    }
  }

  // Dishes Management
  async loadDishes() {
    try {
      const querySnapshot = await window.getDocs(
        window.collection(this.db, "dishes")
      );
      this.dishes = [];
      querySnapshot.forEach((doc) => {
        this.dishes.push({ id: doc.id, ...doc.data() });
      });
      console.log("Loaded dishes:", this.dishes);
      this.renderDishes();
    } catch (error) {
      console.error("Error loading dishes:", error);
    }
  }

  renderDishes() {
    const container = document.getElementById("dishes-list");
    if (!container) return;

    if (this.dishes.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8">
          <i class="fas fa-utensils text-4xl text-gray-300 mb-4"></i>
          <h3 class="text-lg font-semibold text-gray-600 mb-2">No hay platos</h3>
          <p class="text-gray-500">Agrega tu primer plato para comenzar</p>
        </div>
      `;
      return;
    }

    // Debug: Log each dish before rendering
    this.dishes.forEach((dish, index) => {
      console.log(`Dish ${index}:`, dish);
      console.log(`Dish ${index} price:`, dish.price);
      console.log(`Dish ${index} ingredients:`, dish.ingredients);
    });

    container.innerHTML = this.dishes
      .map(
        (dish) => `
            <div class="bg-white/95 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:-translate-y-1 transition-all duration-300">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800">${
                      dish.name
                    }</h3>
                    <div class="flex gap-2">
                        <button class="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors" onclick="restaurantManager.editDish('${
                          dish.id
                        }')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors" onclick="restaurantManager.deleteDish('${
                          dish.id
                        }')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="space-y-2 text-gray-600">
                    <p><span class="font-semibold">Precio de Venta:</span> Bs. ${(
                      dish.price || 0
                    ).toFixed(2)}</p>
                    <p><span class="font-semibold">Costo:</span> Bs. ${(
                      dish.cost || 0
                    ).toFixed(2)}</p>
                    <p><span class="font-semibold">Ganancia:</span> Bs. ${(
                      dish.profit || 0
                    ).toFixed(2)}</p>
                    <div class="ingredients-section">
                        <button class="ingredients-toggle-btn flex items-center justify-between w-full text-left py-2" onclick="toggleIngredients('${
                          dish.id
                        }')">
                            <span class="font-semibold flex items-center">
                                <i class="fas fa-carrot text-purple-500 mr-2"></i>
                                Ingredientes (${
                                  (dish.ingredients || []).length
                                })
                            </span>
                            <i class="fas fa-chevron-down text-gray-500 text-xs ingredients-chevron-${
                              dish.id
                            } transition-transform duration-300"></i>
                        </button>
                        <div id="ingredients-list-${
                          dish.id
                        }" class="ingredients-list-collapsed">
                            <ul class="list-disc list-inside space-y-1 mt-2">
                                ${(dish.ingredients || [])
                                  .map(
                                    (ing) => `
                                    <li>${ing.name}: ${
                                      ing.portions || ing.quantity || 0
                                    } porciones</li>
                                `
                                  )
                                  .join("")}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  calculateDishCost(dish) {
    console.log("calculateDishCost called with dish:", dish);
    console.log("Available ingredients:", this.ingredients);

    if (!dish || !dish.ingredients) {
      console.log("calculateDishCost: returning 0 - no dish or ingredients");
      return 0;
    }

    let totalCost = 0;
    dish.ingredients.forEach((dishIngredient, index) => {
      console.log(`Processing ingredient ${index}:`, dishIngredient);
      console.log("Looking for ingredient ID:", dishIngredient.ingredientId);

      const ingredient = this.ingredients.find(
        (ing) => ing.id === dishIngredient.ingredientId
      );

      if (ingredient) {
        console.log("Found ingredient:", ingredient);
        const costPerPortion =
          ingredient.costPerPortion || ingredient.price / ingredient.portions;
        const portions =
          dishIngredient.portions || dishIngredient.quantity || 0;
        totalCost += costPerPortion * portions;
        console.log(
          `Added ${portions} portions of ${
            ingredient.name
          } at ${costPerPortion} each = ${costPerPortion * portions}`
        );
      } else {
        console.log(
          "Ingredient not found for ID:",
          dishIngredient.ingredientId
        );
        console.log(
          "Available ingredient IDs:",
          this.ingredients.map((ing) => ing.id)
        );
      }
    });
    console.log("Total cost calculated:", totalCost);
    return totalCost;
  }

  showDishModal(dish = null) {
    const modal = document.getElementById("dish-modal");
    const form = document.getElementById("dish-form");

    if (!modal || !form) return;

    if (dish) {
      const nameInput = document.getElementById("dish-name");
      const priceInput = document.getElementById("dish-price");

      if (nameInput) nameInput.value = dish.name;
      if (priceInput) priceInput.value = dish.price;

      form.dataset.dishId = dish.id;
      this.renderDishIngredients(dish.ingredients);
    } else {
      form.reset();
      delete form.dataset.dishId;
      const ingredientsContainer = document.getElementById("dish-ingredients");
      if (ingredientsContainer) {
        ingredientsContainer.innerHTML = "";
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("block");
    // Prevent body scroll
    document.body.style.overflow = "hidden";

    // Calculate initial cost
    setTimeout(() => {
      this.calculateDishCost();
    }, 100);
  }

  renderDishIngredients(ingredients = []) {
    const container = document.getElementById("dish-ingredients");
    if (!container) return;

    if (ingredients.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 text-gray-500">
          <i class="fas fa-utensils text-2xl mb-2"></i>
          <p class="text-sm">No hay ingredientes agregados</p>
          <p class="text-xs">Selecciona ingredientes para comenzar</p>
        </div>
      `;
      return;
    }

    // Clear container first
    container.innerHTML = "";

    // Add each ingredient as a separate element
    ingredients.forEach((ing, index) => {
      const ingredientItem = document.createElement("div");
      ingredientItem.className =
        "bg-white rounded-lg border border-gray-200 p-3 shadow-sm";
      ingredientItem.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="flex-1">
            <select name="ingredient-${index}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm" required>
              <option value="">Seleccionar ingrediente</option>
              ${this.ingredients
                .map(
                  (ingredient) => `
                  <option value="${ingredient.id}" data-cost="${
                    ingredient.costPerPortion ||
                    ingredient.price / ingredient.portions
                  }" ${ingredient.id === ing.ingredientId ? "selected" : ""}>
                    ${ingredient.name} (Bs. ${(
                    ingredient.costPerPortion ||
                    ingredient.price / ingredient.portions
                  ).toFixed(2)}/porción)
                  </option>
                `
                )
                .join("")}
            </select>
          </div>
          <div class="w-20">
            <input type="number" name="portions-${index}" placeholder="Cant." value="${
        ing.portions || ing.quantity || 0
      }" step="0.1" min="0" class="w-full px-2 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm text-center" required>
          </div>
          <button type="button" class="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors text-sm" onclick="this.closest('.bg-white').remove(); restaurantManager.calculateDishCost();">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;

      container.appendChild(ingredientItem);

      // Add event listeners to recalculate cost
      const select = ingredientItem.querySelector("select");
      const input = ingredientItem.querySelector("input");

      if (select && input) {
        const recalculate = () => this.calculateDishCost();
        select.addEventListener("change", recalculate);
        input.addEventListener("input", recalculate);
      }
    });

    // Calculate initial cost
    setTimeout(() => {
      this.calculateDishCost();
    }, 100);
  }

  addIngredientToDish() {
    const container = document.getElementById("dish-ingredients");
    if (!container) return;

    // Generate unique index based on timestamp to avoid conflicts
    const index = Date.now();
    const ingredientItem = document.createElement("div");
    ingredientItem.className =
      "bg-white rounded-lg border border-gray-200 p-3 shadow-sm";
    ingredientItem.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="flex-1">
                    <select name="ingredient-${index}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm" required>
                        <option value="">Seleccionar ingrediente</option>
                        ${this.ingredients
                          .map(
                            (ingredient) => `
                            <option value="${ingredient.id}" data-cost="${
                              ingredient.costPerPortion ||
                              ingredient.price / ingredient.portions
                            }">${ingredient.name} (Bs. ${(
                              ingredient.costPerPortion ||
                              ingredient.price / ingredient.portions
                            ).toFixed(2)}/porción)</option>
                        `
                          )
                          .join("")}
                    </select>
                </div>
                <div class="w-20">
                    <input type="number" name="portions-${index}" placeholder="Cant." step="0.1" min="0" class="w-full px-2 py-2 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm text-center" required>
                </div>
                <button type="button" class="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors text-sm" onclick="this.closest('.bg-white').remove(); restaurantManager.calculateDishCost();">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    container.appendChild(ingredientItem);

    // Add event listener to recalculate cost when ingredient or portions change
    const select = ingredientItem.querySelector("select");
    const input = ingredientItem.querySelector("input");

    const recalculate = () => this.calculateDishCost();
    select.addEventListener("change", recalculate);
    input.addEventListener("input", recalculate);

    // Update cost display
    this.calculateDishCost();
  }

  calculateDishCost() {
    const container = document.getElementById("dish-ingredients");
    const costDisplay = document.getElementById("dish-total-cost");

    if (!container) return;

    let totalCost = 0;

    // Check if there are any ingredients
    const ingredientItems = container.querySelectorAll(".bg-white");

    if (ingredientItems.length === 0) {
      if (costDisplay) {
        costDisplay.textContent = "Costo: Bs. 0.00";
      }
      return;
    }

    ingredientItems.forEach((item, index) => {
      const select = item.querySelector("select");
      const input = item.querySelector("input");

      if (select && input && select.value && input.value) {
        const costPerPortion =
          parseFloat(select.selectedOptions[0].dataset.cost) || 0;
        const portions = parseFloat(input.value) || 0;
        totalCost += costPerPortion * portions;
      }
    });

    if (costDisplay) {
      costDisplay.textContent = `Costo: Bs. ${totalCost.toFixed(2)}`;
    }
  }

  async saveDish() {
    const form = document.getElementById("dish-form");
    const ingredients = [];

    // Collect ingredients from form
    const ingredientItems = document.querySelectorAll(
      "#dish-ingredients > div"
    );
    ingredientItems.forEach((item) => {
      // Find the select and input elements within this item
      const ingredientSelect = item.querySelector("select");
      const portionsInput = item.querySelector("input[type='number']");

      if (
        ingredientSelect &&
        portionsInput &&
        ingredientSelect.value &&
        portionsInput.value
      ) {
        const ingredient = this.ingredients.find(
          (ing) => ing.id === ingredientSelect.value
        );
        if (ingredient) {
          ingredients.push({
            ingredientId: ingredientSelect.value,
            name: ingredient.name,
            portions: parseFloat(portionsInput.value),
            costPerPortion:
              ingredient.costPerPortion ||
              ingredient.price / ingredient.portions,
          });
        }
      }
    });

    // Calculate total cost
    const totalCost = ingredients.reduce((sum, ing) => {
      return sum + ing.costPerPortion * ing.portions;
    }, 0);

    const formData = {
      name: document.getElementById("dish-name").value,
      price: parseFloat(document.getElementById("dish-price").value),
      ingredients: ingredients,
      cost: totalCost, // Save the calculated cost
      profit:
        parseFloat(document.getElementById("dish-price").value) - totalCost, // Save the calculated profit
      createdAt: new Date(),
    };

    console.log("Saving dish:", formData);
    console.log("Firebase db:", this.db);

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    submitBtn.disabled = true;

    try {
      if (form.dataset.dishId) {
        // Update existing dish
        console.log("Updating dish with ID:", form.dataset.dishId);
        await window.updateDoc(
          window.doc(this.db, "dishes", form.dataset.dishId),
          formData
        );
        this.showMessage("Plato actualizado correctamente", "success");
      } else {
        // Add new dish
        console.log("Adding new dish to collection");
        const docRef = await window.addDoc(
          window.collection(this.db, "dishes"),
          formData
        );
        console.log("Document written with ID: ", docRef.id);
        this.showMessage("Plato agregado correctamente", "success");
      }

      this.hideModal("dish-modal");
      this.loadDishes();
      this.updateDashboard();
    } catch (error) {
      console.error("Error saving dish:", error);
      this.showMessage("Error al guardar el plato: " + error.message, "error");
    } finally {
      // Restore button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  }

  editDish(id) {
    const dish = this.dishes.find((d) => d.id === id);
    if (dish) {
      this.showDishModal(dish);
    }
  }

  async deleteDish(id) {
    if (confirm("¿Estás seguro de que quieres eliminar este plato?")) {
      try {
        await window.deleteDoc(window.doc(this.db, "dishes", id));
        this.showMessage("Plato eliminado correctamente", "success");
        this.loadDishes();
        this.updateDashboard();
      } catch (error) {
        console.error("Error deleting dish:", error);
        this.showMessage("Error al eliminar el plato", "error");
      }
    }
  }

  // Sales Management
  async loadSales() {
    try {
      const querySnapshot = await window.getDocs(
        window.collection(this.db, "sales")
      );
      this.sales = [];
      querySnapshot.forEach((doc) => {
        this.sales.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error("Error loading sales:", error);
    }
  }

  loadDishesForSale() {
    const select = document.getElementById("sale-dish");
    select.innerHTML = '<option value="">Seleccionar plato</option>';
    this.dishes.forEach((dish) => {
      const option = document.createElement("option");
      option.value = dish.id;
      option.textContent = `${dish.name} - Bs. ${dish.price.toFixed(2)}`;
      select.appendChild(option);
    });
  }

  showSalesForm() {
    const modal = document.getElementById("sale-modal");
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.classList.add("block");
    // Prevent body scroll
    document.body.style.overflow = "hidden";

    this.loadDishesForSale();

    // Clear previous sale items
    this.currentSaleItems = [];
    this.updateSaleItemsList();
  }

  hideSalesForm() {
    const modal = document.getElementById("sale-modal");
    if (modal) {
      modal.classList.add("hidden");
      modal.classList.remove("block");
      // Restore body scroll
      document.body.style.overflow = "auto";
    }

    const form = document.getElementById("sale-form");
    if (form) {
      form.reset();
    }
  }

  async saveSale() {
    const dishId = document.getElementById("sale-dish").value;
    const quantity = parseInt(document.getElementById("sale-quantity").value);
    const price = parseFloat(document.getElementById("sale-price").value);

    const dish = this.dishes.find((d) => d.id === dishId);
    if (!dish) {
      this.showMessage("Plato no encontrado", "error");
      return;
    }

    const saleData = {
      dishId: dishId,
      dishName: dish.name,
      quantity: quantity,
      price: price,
      total: price * quantity,
      cost: this.calculateDishCost(dish) * quantity,
      profit: (price - this.calculateDishCost(dish)) * quantity,
      createdAt: new Date(),
    };

    try {
      await window.addDoc(window.collection(this.db, "sales"), saleData);
      this.showMessage("Venta registrada correctamente", "success");
      this.hideSalesForm();
      this.loadSales();
      this.loadTodaySales();
      this.updateDashboard();
    } catch (error) {
      console.error("Error saving sale:", error);
      this.showMessage("Error al registrar la venta", "error");
    }
  }

  loadTodaySales() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = this.sales.filter((sale) => {
      let saleDate;
      if (sale.createdAt && sale.createdAt.toDate) {
        saleDate = sale.createdAt.toDate();
      } else if (sale.createdAt) {
        saleDate = new Date(sale.createdAt);
      } else {
        return false;
      }
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime();
    });

    const container = document.getElementById("today-sales-list");
    if (todaySales.length === 0) {
      container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-cash-register text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No hay ventas hoy</h3>
                    <p class="text-gray-500">Registra tu primera venta del día</p>
                </div>
            `;
      return;
    }

    container.innerHTML = todaySales
      .map((sale) => {
        let saleTime;
        if (sale.createdAt && sale.createdAt.toDate) {
          saleTime = sale.createdAt.toDate().toLocaleTimeString();
        } else if (sale.createdAt) {
          saleTime = new Date(sale.createdAt).toLocaleTimeString();
        } else {
          saleTime = "Hora no disponible";
        }

        return `
            <div class="flex justify-between items-center p-4 mb-2 bg-blue-50 rounded-xl border border-blue-200">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-800">${
                      sale.dishName
                    }</h4>
                    <p class="text-sm text-gray-600">Cantidad: ${
                      sale.quantity
                    } | ${saleTime}</p>
                </div>
                <div class="text-lg font-bold text-green-600">
                    Bs. ${sale.total.toFixed(2)}
                </div>
            </div>
        `;
      })
      .join("");
  }

  // Reports
  loadReports() {
    const today = new Date();
    document.getElementById("report-date").value = today
      .toISOString()
      .split("T")[0];
    this.generateReport();
  }

  generateReport() {
    const selectedDate = document.getElementById("report-date").value;
    const date = new Date(selectedDate);
    const currentPeriod = this.currentPeriod || "daily";

    // Filter sales based on current period
    let filteredSales = this.getSalesForPeriod(date, currentPeriod);

    // Calculate totals (handle both old and new sale formats)
    const totalSales = filteredSales.reduce((sum, sale) => {
      return sum + (sale.totalAmount || sale.total || 0);
    }, 0);

    const totalCosts = filteredSales.reduce((sum, sale) => {
      return sum + (sale.totalCost || sale.cost || 0);
    }, 0);

    const totalProfit = filteredSales.reduce((sum, sale) => {
      return sum + (sale.totalProfit || sale.profit || 0);
    }, 0);

    const totalItems = filteredSales.reduce((sum, sale) => {
      return sum + (sale.itemCount || sale.quantity || 1);
    }, 0);

    const averageSale =
      filteredSales.length > 0 ? totalSales / filteredSales.length : 0;

    // Update summary cards
    document.getElementById(
      "total-sales-amount"
    ).textContent = `Bs. ${totalSales.toFixed(2)}`;
    document.getElementById(
      "total-profit-amount"
    ).textContent = `Bs. ${totalProfit.toFixed(2)}`;
    document.getElementById("total-items-count").textContent = totalItems;
    document.getElementById(
      "average-sale-amount"
    ).textContent = `Bs. ${averageSale.toFixed(2)}`;

    // Create charts
    this.createSalesTrendChart(filteredSales, currentPeriod);
    this.createTopDishesChart(filteredSales);
    this.createDayOfWeekChart(filteredSales);
    this.createMonthlyChart(filteredSales);

    // Sales Detail
    document.getElementById("sales-detail").innerHTML =
      filteredSales.length > 0
        ? filteredSales
            .map((sale) => {
              const saleTime = sale.createdAt.toDate
                ? sale.createdAt.toDate()
                : new Date(sale.createdAt);
              const timeString = saleTime.toLocaleTimeString("es-BO", {
                hour: "2-digit",
                minute: "2-digit",
              });

              if (sale.items && Array.isArray(sale.items)) {
                // New format
                return `
            <div class="bg-white rounded-lg p-4 shadow-md border border-gray-200 mb-3">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="font-semibold text-gray-800">Venta #${sale.id.slice(
                    -6
                  )}</h4>
                  <p class="text-sm text-gray-600">${timeString}</p>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <p class="font-bold text-green-600">Bs. ${sale.totalAmount.toFixed(
                      2
                    )}</p>
                    <p class="text-sm text-gray-600">${sale.itemCount} items</p>
                  </div>
                  <button onclick="restaurantManager.deleteSale('${sale.id}')" 
                          class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors duration-200">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="text-sm text-gray-600">
                <p><strong>Items:</strong> ${sale.items
                  .map((item) => `${item.dishName} (${item.quantity})`)
                  .join(", ")}</p>
                <p><strong>Costo:</strong> Bs. ${sale.totalCost.toFixed(
                  2
                )} | <strong>Ganancia:</strong> Bs. ${sale.totalProfit.toFixed(
                  2
                )}</p>
              </div>
            </div>
          `;
              } else {
                // Old format
                return `
            <div class="bg-white rounded-lg p-4 shadow-md border border-gray-200 mb-3">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h4 class="font-semibold text-gray-800">${
                    sale.dishName || "Plato"
                  }</h4>
                  <p class="text-sm text-gray-600">${timeString}</p>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <p class="font-bold text-green-600">Bs. ${(
                      sale.totalAmount ||
                      sale.total ||
                      0
                    ).toFixed(2)}</p>
                    <p class="text-sm text-gray-600">Cantidad: ${
                      sale.quantity || 1
                    }</p>
                  </div>
                  <button onclick="restaurantManager.deleteSale('${sale.id}')" 
                          class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors duration-200">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="text-sm text-gray-600">
                <p><strong>Costo:</strong> Bs. ${(
                  sale.totalCost ||
                  sale.cost ||
                  0
                ).toFixed(2)} | <strong>Ganancia:</strong> Bs. ${(
                  sale.totalProfit ||
                  sale.profit ||
                  0
                ).toFixed(2)}</p>
              </div>
            </div>
          `;
              }
            })
            .join("")
        : '<p class="text-gray-500 text-center py-8">No hay ventas registradas para esta fecha</p>';
  }

  // Chart Functions
  getSalesForPeriod(date, period) {
    const sales = this.sales.filter((sale) => {
      let saleDate;
      if (sale.createdAt && sale.createdAt.toDate) {
        saleDate = sale.createdAt.toDate();
      } else if (sale.createdAt) {
        saleDate = new Date(sale.createdAt);
      } else {
        return false;
      }

      switch (period) {
        case "daily":
          return saleDate.toDateString() === date.toDateString();
        case "weekly":
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return saleDate >= weekStart && saleDate <= weekEnd;
        case "monthly":
          return (
            saleDate.getMonth() === date.getMonth() &&
            saleDate.getFullYear() === date.getFullYear()
          );
        case "yearly":
          return saleDate.getFullYear() === date.getFullYear();
        default:
          return saleDate.toDateString() === date.toDateString();
      }
    });
    return sales;
  }

  createSalesTrendChart(sales, period) {
    const ctx = document.getElementById("salesTrendChart").getContext("2d");

    // Destroy existing chart if it exists
    if (this.salesTrendChart) {
      this.salesTrendChart.destroy();
    }

    const chartData = this.getTrendChartData(sales, period);

    this.salesTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: "Ventas (Bs.)",
            data: chartData.sales,
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Ganancias (Bs.)",
            data: chartData.profits,
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "Bs. " + value.toFixed(2);
              },
            },
          },
        },
      },
    });
  }

  createTopDishesChart(sales) {
    const ctx = document.getElementById("topDishesChart").getContext("2d");

    if (this.topDishesChart) {
      this.topDishesChart.destroy();
    }

    const dishSales = {};
    sales.forEach((sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          if (!dishSales[item.dishName]) {
            dishSales[item.dishName] = 0;
          }
          dishSales[item.dishName] += item.quantity;
        });
      } else {
        const dishName = sale.dishName || "Plato";
        if (!dishSales[dishName]) {
          dishSales[dishName] = 0;
        }
        dishSales[dishName] += sale.quantity || 1;
      }
    });

    const topDishes = Object.entries(dishSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    this.topDishesChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: topDishes.map(([name]) => name),
        datasets: [
          {
            data: topDishes.map(([, quantity]) => quantity),
            backgroundColor: [
              "rgba(255, 99, 132, 0.8)",
              "rgba(54, 162, 235, 0.8)",
              "rgba(255, 205, 86, 0.8)",
              "rgba(75, 192, 192, 0.8)",
              "rgba(153, 102, 255, 0.8)",
            ],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  createDayOfWeekChart(sales) {
    const ctx = document.getElementById("dayOfWeekChart").getContext("2d");

    if (this.dayOfWeekChart) {
      this.dayOfWeekChart.destroy();
    }

    const daySales = [0, 0, 0, 0, 0, 0, 0]; // Domingo a Sábado
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    sales.forEach((sale) => {
      let saleDate;
      if (sale.createdAt && sale.createdAt.toDate) {
        saleDate = sale.createdAt.toDate();
      } else if (sale.createdAt) {
        saleDate = new Date(sale.createdAt);
      } else {
        return;
      }

      const dayOfWeek = saleDate.getDay();
      const amount = sale.totalAmount || sale.total || 0;
      daySales[dayOfWeek] += amount;
    });

    this.dayOfWeekChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: dayNames,
        datasets: [
          {
            label: "Ventas (Bs.)",
            data: daySales,
            backgroundColor: "rgba(147, 51, 234, 0.8)",
            borderColor: "rgba(147, 51, 234, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "Bs. " + value.toFixed(2);
              },
            },
          },
        },
      },
    });
  }

  createMonthlyChart(sales) {
    const ctx = document.getElementById("monthlyChart").getContext("2d");

    if (this.monthlyChart) {
      this.monthlyChart.destroy();
    }

    const monthSales = new Array(12).fill(0);
    const monthNames = [
      "Ene",
      "Feb",
      "Mar",
      "Abr",
      "May",
      "Jun",
      "Jul",
      "Ago",
      "Sep",
      "Oct",
      "Nov",
      "Dic",
    ];

    sales.forEach((sale) => {
      let saleDate;
      if (sale.createdAt && sale.createdAt.toDate) {
        saleDate = sale.createdAt.toDate();
      } else if (sale.createdAt) {
        saleDate = new Date(sale.createdAt);
      } else {
        return;
      }

      const month = saleDate.getMonth();
      const amount = sale.totalAmount || sale.total || 0;
      monthSales[month] += amount;
    });

    this.monthlyChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: monthNames,
        datasets: [
          {
            label: "Ventas (Bs.)",
            data: monthSales,
            backgroundColor: "rgba(16, 185, 129, 0.8)",
            borderColor: "rgba(16, 185, 129, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "Bs. " + value.toFixed(2);
              },
            },
          },
        },
      },
    });
  }

  getTrendChartData(sales, period) {
    const labels = [];
    const salesData = [];
    const profitsData = [];

    switch (period) {
      case "daily":
        // Group by hour
        const hourlyData = new Array(24)
          .fill(0)
          .map(() => ({ sales: 0, profits: 0 }));
        sales.forEach((sale) => {
          let saleDate;
          if (sale.createdAt && sale.createdAt.toDate) {
            saleDate = sale.createdAt.toDate();
          } else if (sale.createdAt) {
            saleDate = new Date(sale.createdAt);
          } else {
            return;
          }

          const hour = saleDate.getHours();
          hourlyData[hour].sales += sale.totalAmount || sale.total || 0;
          hourlyData[hour].profits += sale.totalProfit || sale.profit || 0;
        });

        for (let i = 0; i < 24; i++) {
          labels.push(`${i}:00`);
          salesData.push(hourlyData[i].sales);
          profitsData.push(hourlyData[i].profits);
        }
        break;

      case "weekly":
        // Group by day of week
        const dailyData = new Array(7)
          .fill(0)
          .map(() => ({ sales: 0, profits: 0 }));
        const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

        sales.forEach((sale) => {
          let saleDate;
          if (sale.createdAt && sale.createdAt.toDate) {
            saleDate = sale.createdAt.toDate();
          } else if (sale.createdAt) {
            saleDate = new Date(sale.createdAt);
          } else {
            return;
          }

          const dayOfWeek = saleDate.getDay();
          dailyData[dayOfWeek].sales += sale.totalAmount || sale.total || 0;
          dailyData[dayOfWeek].profits += sale.totalProfit || sale.profit || 0;
        });

        dayNames.forEach((day, index) => {
          labels.push(day);
          salesData.push(dailyData[index].sales);
          profitsData.push(dailyData[index].profits);
        });
        break;

      case "monthly":
        // Group by day of month
        const daysInMonth = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0
        ).getDate();
        const monthlyData = new Array(daysInMonth)
          .fill(0)
          .map(() => ({ sales: 0, profits: 0 }));

        sales.forEach((sale) => {
          let saleDate;
          if (sale.createdAt && sale.createdAt.toDate) {
            saleDate = sale.createdAt.toDate();
          } else if (sale.createdAt) {
            saleDate = new Date(sale.createdAt);
          } else {
            return;
          }

          const dayOfMonth = saleDate.getDate() - 1;
          if (dayOfMonth >= 0 && dayOfMonth < daysInMonth) {
            monthlyData[dayOfMonth].sales +=
              sale.totalAmount || sale.total || 0;
            monthlyData[dayOfMonth].profits +=
              sale.totalProfit || sale.profit || 0;
          }
        });

        for (let i = 1; i <= daysInMonth; i++) {
          labels.push(`${i}`);
          salesData.push(monthlyData[i - 1].sales);
          profitsData.push(monthlyData[i - 1].profits);
        }
        break;

      case "yearly":
        // Group by month
        const yearlyData = new Array(12)
          .fill(0)
          .map(() => ({ sales: 0, profits: 0 }));
        const monthNames = [
          "Ene",
          "Feb",
          "Mar",
          "Abr",
          "May",
          "Jun",
          "Jul",
          "Ago",
          "Sep",
          "Oct",
          "Nov",
          "Dic",
        ];

        sales.forEach((sale) => {
          let saleDate;
          if (sale.createdAt && sale.createdAt.toDate) {
            saleDate = sale.createdAt.toDate();
          } else if (sale.createdAt) {
            saleDate = new Date(sale.createdAt);
          } else {
            return;
          }

          const month = saleDate.getMonth();
          yearlyData[month].sales += sale.totalAmount || sale.total || 0;
          yearlyData[month].profits += sale.totalProfit || sale.profit || 0;
        });

        monthNames.forEach((month, index) => {
          labels.push(month);
          salesData.push(yearlyData[index].sales);
          profitsData.push(yearlyData[index].profits);
        });
        break;
    }

    return { labels, sales: salesData, profits: profitsData };
  }

  // Dashboard
  updateDashboard() {
    // Update stats
    const totalIngredientsEl = document.getElementById("total-ingredients");
    if (totalIngredientsEl) {
      totalIngredientsEl.textContent = this.ingredients.length;
    }

    const totalDishesEl = document.getElementById("total-dishes");
    if (totalDishesEl) {
      totalDishesEl.textContent = this.dishes.length;
    }

    // Today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = this.sales.filter((sale) => {
      let saleDate;
      if (sale.createdAt && sale.createdAt.toDate) {
        saleDate = sale.createdAt.toDate();
      } else if (sale.createdAt) {
        saleDate = new Date(sale.createdAt);
      } else {
        return false;
      }
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime();
    });

    const todayTotal = todaySales.reduce((sum, sale) => {
      // Handle both old format (single dish) and new format (multiple dishes)
      return sum + (sale.totalAmount || sale.total || 0);
    }, 0);
    const todayProfit = todaySales.reduce((sum, sale) => {
      // Handle both old format (single dish) and new format (multiple dishes)
      return sum + (sale.totalProfit || sale.profit || 0);
    }, 0);

    const todaySalesEl = document.getElementById("today-total");
    if (todaySalesEl) {
      todaySalesEl.textContent = `Bs. ${todayTotal.toFixed(2)}`;
    }

    const todayProfitEl = document.getElementById("today-profit");
    if (todayProfitEl) {
      todayProfitEl.textContent = `Bs. ${todayProfit.toFixed(2)}`;
    }

    // Recent sales (individual transactions from today)
    const recentSalesEl = document.getElementById("recent-sales");
    if (recentSalesEl) {
      if (todaySales.length === 0) {
        recentSalesEl.innerHTML =
          '<p class="text-gray-500 text-center py-4">No hay ventas hoy</p>';
      } else {
        // Sort by creation time (most recent first) and take last 5
        const sortedTodaySales = todaySales
          .sort((a, b) => {
            const dateA =
              a.createdAt && a.createdAt.toDate
                ? a.createdAt.toDate()
                : new Date(a.createdAt);
            const dateB =
              b.createdAt && b.createdAt.toDate
                ? b.createdAt.toDate()
                : new Date(b.createdAt);
            return dateB - dateA;
          })
          .slice(0, 5);

        recentSalesEl.innerHTML = sortedTodaySales
          .map((sale) => {
            const saleTime =
              sale.createdAt && sale.createdAt.toDate
                ? sale.createdAt.toDate()
                : new Date(sale.createdAt);
            const timeString = saleTime.toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            });

            let dishesList = "";
            if (sale.items && sale.items.length > 0) {
              // New format: multiple dishes per sale
              dishesList = sale.items
                .map((item) => `${item.dishName} (${item.quantity})`)
                .join(", ");
            } else if (sale.dishName) {
              // Old format: single dish per sale
              dishesList = `${sale.dishName} (${sale.quantity || 1})`;
            }

            return `
              <div class="bg-white card-mobile p-3 border-l-4 border-green-500">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-sm font-semibold text-gray-800">${timeString}</span>
                      <span class="text-sm font-bold text-green-600">Bs. ${(
                        sale.totalAmount ||
                        sale.total ||
                        0
                      ).toFixed(2)}</span>
                    </div>
                    <p class="text-xs text-gray-600">${dishesList}</p>
                  </div>
                </div>
              </div>
            `;
          })
          .join("");
      }
    }

    // Dishes sold today (quantity per dish)
    const dishSales = {};
    todaySales.forEach((sale) => {
      if (sale.items && sale.items.length > 0) {
        // New format: multiple dishes per sale
        sale.items.forEach((item) => {
          if (!dishSales[item.dishName]) {
            dishSales[item.dishName] = 0;
          }
          dishSales[item.dishName] += item.quantity;
        });
      } else if (sale.dishName) {
        // Old format: single dish per sale
        if (!dishSales[sale.dishName]) {
          dishSales[sale.dishName] = 0;
        }
        dishSales[sale.dishName] += sale.quantity || 1;
      }
    });

    const dishesSoldEl = document.getElementById("dishes-sold-today");
    if (dishesSoldEl) {
      if (Object.keys(dishSales).length === 0) {
        dishesSoldEl.innerHTML =
          '<p class="text-gray-500 text-center py-4">No hay ventas hoy</p>';
      } else {
        const sortedDishSales = Object.entries(dishSales)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8); // Show top 8 dishes

        dishesSoldEl.innerHTML = sortedDishSales
          .map(
            ([dishName, quantity]) => `
            <div class="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div class="flex items-center">
                <i class="fas fa-utensils text-purple-500 mr-3"></i>
                <span class="text-sm font-medium text-gray-800">${dishName}</span>
              </div>
              <div class="flex items-center">
                <span class="text-sm font-bold text-purple-600 mr-2">${quantity}</span>
                <span class="text-xs text-gray-500">vendidos</span>
              </div>
            </div>
          `
          )
          .join("");
      }
    }
  }

  // Utility functions
  showMessage(message, type) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-xl font-semibold shadow-lg ${
      type === "success"
        ? "bg-green-100 text-green-800 border border-green-200"
        : "bg-red-100 text-red-800 border border-red-200"
    }`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  async updateDishesWithIngredient(ingredientName) {
    console.log(`Updating dishes that use ingredient: ${ingredientName}`);

    try {
      // Find the updated ingredient
      const updatedIngredient = this.ingredients.find(
        (ing) => ing.name === ingredientName
      );
      if (!updatedIngredient) {
        console.log("Ingredient not found:", ingredientName);
        return;
      }

      console.log("Updated ingredient:", updatedIngredient);

      // Find all dishes that use this ingredient
      const dishesToUpdate = this.dishes.filter((dish) => {
        return (
          dish.ingredients &&
          dish.ingredients.some(
            (ing) => ing.ingredientId === updatedIngredient.id
          )
        );
      });

      console.log(
        `Found ${dishesToUpdate.length} dishes to update:`,
        dishesToUpdate
      );

      // Update each dish
      for (const dish of dishesToUpdate) {
        console.log(`Updating dish: ${dish.name}`);

        // Recalculate cost for this dish
        let newTotalCost = 0;
        const updatedIngredients = dish.ingredients.map((dishIngredient) => {
          if (dishIngredient.ingredientId === updatedIngredient.id) {
            // Update this ingredient's cost per portion
            const newCostPerPortion =
              updatedIngredient.costPerPortion ||
              updatedIngredient.price / updatedIngredient.portions;
            const portions =
              dishIngredient.portions || dishIngredient.quantity || 0;
            newTotalCost += newCostPerPortion * portions;

            return {
              ...dishIngredient,
              costPerPortion: newCostPerPortion,
            };
          } else {
            // Keep other ingredients as they are
            const otherIngredient = this.ingredients.find(
              (ing) => ing.id === dishIngredient.ingredientId
            );
            if (otherIngredient) {
              const costPerPortion =
                otherIngredient.costPerPortion ||
                otherIngredient.price / otherIngredient.portions;
              const portions =
                dishIngredient.portions || dishIngredient.quantity || 0;
              newTotalCost += costPerPortion * portions;
            }
            return dishIngredient;
          }
        });

        const newProfit = dish.price - newTotalCost;

        console.log(
          `Dish ${dish.name}: New cost = ${newTotalCost}, New profit = ${newProfit}`
        );

        // Update the dish in Firebase
        await window.updateDoc(window.doc(this.db, "dishes", dish.id), {
          ingredients: updatedIngredients,
          cost: newTotalCost,
          profit: newProfit,
        });
      }

      // Reload dishes to show updated costs
      await this.loadDishes();

      if (dishesToUpdate.length > 0) {
        this.showMessage(
          `Se actualizaron ${dishesToUpdate.length} platos con el nuevo costo del ingrediente`,
          "success"
        );
      }
    } catch (error) {
      console.error("Error updating dishes with ingredient:", error);
      this.showMessage("Error al actualizar los platos", "error");
    }
  }

  // Sales Management
  async loadSales() {
    try {
      const querySnapshot = await window.getDocs(
        window.collection(this.db, "sales")
      );
      this.sales = [];
      querySnapshot.forEach((doc) => {
        this.sales.push({ id: doc.id, ...doc.data() });
      });
      console.log("Sales loaded:", this.sales);
    } catch (error) {
      console.error("Error loading sales:", error);
    }
  }

  loadDishesForSale() {
    const select = document.getElementById("sale-dish");
    select.innerHTML = '<option value="">Seleccionar plato</option>';

    this.dishes.forEach((dish) => {
      const option = document.createElement("option");
      option.value = dish.id;
      option.textContent = `${dish.name} - Bs. ${dish.price.toFixed(2)}`;
      option.dataset.price = dish.price;
      option.dataset.cost = dish.cost || 0;
      select.appendChild(option);
    });
  }

  showSalesForm() {
    this.loadDishesForSale();
    document.getElementById("sale-modal").style.display = "block";

    // Clear previous sale items
    this.currentSaleItems = [];
    this.updateSaleItemsList();
  }

  hideSalesForm() {
    document.getElementById("sale-modal").style.display = "none";
    document.getElementById("sale-form").reset();
    this.currentSaleItems = [];
  }

  addDishToSale() {
    console.log("addDishToSale called");
    const dishId = document.getElementById("sale-dish").value;
    const quantity = parseInt(document.getElementById("sale-quantity").value);
    const price = parseFloat(document.getElementById("sale-price").value);

    console.log("Form values:", { dishId, quantity, price });

    if (!dishId || !quantity || !price) {
      this.showMessage("Por favor completa todos los campos", "error");
      return;
    }

    const dish = this.dishes.find((d) => d.id === dishId);
    if (!dish) {
      this.showMessage("Plato no encontrado", "error");
      return;
    }

    // Check if dish already exists in sale
    const existingItemIndex = this.currentSaleItems.findIndex(
      (item) => item.dishId === dishId
    );

    if (existingItemIndex >= 0) {
      // Update existing item
      this.currentSaleItems[existingItemIndex].quantity += quantity;
      this.currentSaleItems[existingItemIndex].totalPrice =
        this.currentSaleItems[existingItemIndex].quantity * price;
    } else {
      // Add new item
      this.currentSaleItems.push({
        dishId: dishId,
        dishName: dish.name,
        quantity: quantity,
        price: price,
        cost: dish.cost || 0,
        totalPrice: quantity * price,
        totalCost: quantity * (dish.cost || 0),
        profit: quantity * (price - (dish.cost || 0)),
      });
    }

    this.updateSaleItemsList();

    // Clear form
    document.getElementById("sale-dish").value = "";
    document.getElementById("sale-quantity").value = "1";
    document.getElementById("sale-price").value = "";
  }

  removeDishFromSale(index) {
    this.currentSaleItems.splice(index, 1);
    this.updateSaleItemsList();
  }

  updateSaleItemsList() {
    const container = document.getElementById("sale-items-list");
    const totalDisplay = document.getElementById("sale-total");

    if (this.currentSaleItems.length === 0) {
      container.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-shopping-cart text-4xl mb-2"></i>
          <p>No hay platos agregados a la venta</p>
        </div>
      `;
      totalDisplay.textContent = "Bs. 0.00";
      return;
    }

    container.innerHTML = this.currentSaleItems
      .map(
        (item, index) => `
        <div class="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
          <div class="flex-1">
            <h5 class="font-semibold text-gray-800">${item.dishName}</h5>
            <p class="text-sm text-gray-600">Cantidad: ${
              item.quantity
            } × Bs. ${item.price.toFixed(2)}</p>
          </div>
          <div class="flex items-center gap-3">
            <span class="font-bold text-green-600">Bs. ${item.totalPrice.toFixed(
              2
            )}</span>
            <button type="button" class="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors" onclick="restaurantManager.removeDishFromSale(${index})">
              <i class="fas fa-trash text-sm"></i>
            </button>
          </div>
        </div>
      `
      )
      .join("");

    // Calculate total
    const total = this.currentSaleItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    totalDisplay.textContent = `Bs. ${total.toFixed(2)}`;
  }

  async saveSale() {
    // Prevent double submission
    if (this.isSavingSale) {
      console.log("Sale already being saved, ignoring duplicate request");
      return;
    }

    this.isSavingSale = true;

    // Disable submit button to prevent double submission
    const saveButton = document.getElementById("save-sale");
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Guardando...";
    }

    console.log("saveSale called");
    console.log("Current sale items:", this.currentSaleItems);

    if (!this.currentSaleItems || this.currentSaleItems.length === 0) {
      this.showMessage("Agrega al menos un plato a la venta", "error");
      this.resetSaveButton();
      this.isSavingSale = false;
      return;
    }

    // Calculate totals
    const totalAmount = this.currentSaleItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );
    const totalCost = this.currentSaleItems.reduce(
      (sum, item) => sum + item.totalCost,
      0
    );
    const totalProfit = this.currentSaleItems.reduce(
      (sum, item) => sum + item.profit,
      0
    );

    const saleData = {
      items: this.currentSaleItems,
      totalAmount: totalAmount,
      totalCost: totalCost,
      totalProfit: totalProfit,
      itemCount: this.currentSaleItems.length,
      status: "active", // New field to track order status
      createdAt: new Date(),
    };

    try {
      console.log("Saving sale with data:", saleData);
      console.log("Sale timestamp:", new Date().toISOString());
      // Save the sale
      const docRef = await window.addDoc(
        window.collection(this.db, "sales"),
        saleData
      );
      console.log("Sale saved with ID:", docRef.id);

      // Update cash: add both cost and profit from the sale
      await this.updateCashFromSale(totalCost, totalProfit);

      this.showMessage("Venta registrada correctamente", "success");
      this.hideSalesForm();
      await this.loadSales();
      this.loadTodaySales();
      this.updateDashboard();

      // Update comandas in real-time if comandas view is active
      // Use a small delay to ensure sales data is fully loaded
      setTimeout(() => {
        this.updateComandasRealTime();
        this.resetSaveButton();
        this.isSavingSale = false; // Reset flag after completion
      }, 100);
    } catch (error) {
      console.error("Error saving sale:", error);
      this.showMessage("Error al registrar la venta", "error");
      this.resetSaveButton();
      this.isSavingSale = false; // Reset flag on error
    }
  }

  resetSaveButton() {
    const saveButton = document.getElementById("save-sale");
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = "Guardar Venta";
    }
  }

  loadTodaySales() {
    console.log("=== LOADING TODAY SALES ===");
    console.log("Total sales:", this.sales.length);
    console.log("Sales data:", this.sales);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaySales = this.sales.filter((sale) => {
      const saleDate = sale.createdAt.toDate
        ? sale.createdAt.toDate()
        : new Date(sale.createdAt);
      saleDate.setHours(0, 0, 0, 0);
      return saleDate.getTime() === today.getTime();
    });

    console.log("Today sales found:", todaySales.length);

    const container = document.getElementById("today-sales-list");
    console.log("Container found:", !!container);

    if (todaySales.length === 0) {
      if (container) {
        container.innerHTML = `
          <div class="text-center py-8">
            <i class="fas fa-shopping-cart text-4xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">No hay ventas registradas hoy</p>
          </div>
        `;
      }
      return;
    }

    try {
      // Sort sales by creation time (most recent first)
      const sortedSales = todaySales.sort((a, b) => {
        const dateA = a.createdAt.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt);
        const dateB = b.createdAt.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });

      console.log("Sorted sales:", sortedSales.length);

      if (container) {
        container.innerHTML = sortedSales
          .map((sale) => {
            const saleTime = sale.createdAt.toDate
              ? sale.createdAt.toDate()
              : new Date(sale.createdAt);
            const timeString = saleTime.toLocaleTimeString("es-BO", {
              hour: "2-digit",
              minute: "2-digit",
            });

            // Handle both old format (single dish) and new format (multiple dishes)
            if (sale.items && sale.items.length > 0) {
              // New format: multiple dishes
              const itemsList = sale.items
                .map((item) => `${item.dishName} (${item.quantity})`)
                .join(", ");

              // Calculate totals for this sale
              const totalAmount =
                sale.totalAmount ||
                sale.items.reduce(
                  (sum, item) => sum + item.price * item.quantity,
                  0
                );
              const totalCost =
                sale.totalCost ||
                sale.items.reduce(
                  (sum, item) => sum + item.cost * item.quantity,
                  0
                );
              const totalProfit = sale.totalProfit || totalAmount - totalCost;

              return `
            <div class="p-4 mb-3 bg-blue-50 rounded-xl border border-blue-200">
              <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-800">Venta #${sale.id.slice(
                    -6
                  )}</h4>
                  <p class="text-sm text-gray-600">${timeString} | ${
                sale.itemCount || sale.items.length
              } platos</p>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <div class="text-lg font-bold text-green-600">
                      Bs. ${totalAmount.toFixed(2)}
                    </div>
                    <div class="text-xs text-gray-500">
                      Ganancia: Bs. ${totalProfit.toFixed(2)}
                    </div>
                  </div>
                  <button onclick="restaurantManager.deleteSale('${sale.id}')" 
                          class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors duration-200">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="text-sm text-gray-600">
                <strong>Platos:</strong> ${itemsList}
              </div>
              <div class="mt-2 pt-2 border-t border-blue-200">
                <div class="flex justify-between text-xs text-gray-500">
                  <span>Capital: Bs. ${totalCost.toFixed(2)}</span>
                  <span>Margen: ${
                    totalAmount > 0
                      ? ((totalProfit / totalAmount) * 100).toFixed(1)
                      : 0
                  }%</span>
                </div>
              </div>
            </div>
          `;
            } else {
              // Old format: single dish (backward compatibility)
              const totalAmount = sale.price * sale.quantity;
              const totalCost = sale.cost * sale.quantity;
              const totalProfit = totalAmount - totalCost;

              return `
            <div class="p-4 mb-3 bg-blue-50 rounded-xl border border-blue-200">
              <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                  <h4 class="font-semibold text-gray-800">Venta #${sale.id.slice(
                    -6
                  )}</h4>
                  <p class="text-sm text-gray-600">${timeString} | ${
                sale.quantity
              } platos</p>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <div class="text-lg font-bold text-green-600">
                      Bs. ${totalAmount.toFixed(2)}
                    </div>
                    <div class="text-xs text-gray-500">
                      Ganancia: Bs. ${totalProfit.toFixed(2)}
                    </div>
                  </div>
                  <button onclick="restaurantManager.deleteSale('${sale.id}')" 
                          class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors duration-200">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <div class="text-sm text-gray-600">
                <strong>Plato:</strong> ${sale.dishName}
              </div>
              <div class="mt-2 pt-2 border-t border-blue-200">
                <div class="flex justify-between text-xs text-gray-500">
                  <span>Capital: Bs. ${totalCost.toFixed(2)}</span>
                  <span>Margen: ${
                    totalAmount > 0
                      ? ((totalProfit / totalAmount) * 100).toFixed(1)
                      : 0
                  }%</span>
                </div>
              </div>
            </div>
          `;
            }
          })
          .join("");
      } else {
        console.error("Container not found!");
      }
    } catch (error) {
      console.error("Error rendering sales:", error);
    }

    // Update daily financial summary
    console.log("=== CALLING UPDATE DAILY FINANCIAL SUMMARY ===");
    console.log("Today sales to process:", todaySales);
    this.updateDailyFinancialSummary(todaySales);
  }

  // Update daily financial summary
  updateDailyFinancialSummary(todaySales) {
    console.log("Updating daily financial summary...");
    console.log("Today sales data:", todaySales);

    // Calculate totals
    let totalSales = 0;
    let totalCapital = 0;
    let totalProfit = 0;

    todaySales.forEach((sale) => {
      console.log("Processing sale:", sale);

      // Total sales amount - handle different data structures
      let saleAmount = 0;
      if (sale.totalAmount) {
        saleAmount = sale.totalAmount;
      } else if (sale.total) {
        saleAmount = sale.total;
      } else if (sale.items && sale.items.length > 0) {
        // New format: multiple items
        saleAmount = sale.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
      } else if (sale.price && sale.quantity) {
        // Old format: single item
        saleAmount = sale.price * sale.quantity;
      }
      totalSales += saleAmount;

      // Total capital (cost) - handle different data structures
      let saleCapital = 0;
      if (sale.totalCost) {
        saleCapital = sale.totalCost;
      } else if (sale.cost) {
        saleCapital = sale.cost;
      } else if (sale.items && sale.items.length > 0) {
        // New format: multiple items
        saleCapital = sale.items.reduce(
          (sum, item) => sum + item.cost * item.quantity,
          0
        );
      }
      totalCapital += saleCapital;

      // Total profit
      const saleProfit =
        sale.totalProfit || sale.profit || saleAmount - saleCapital;
      totalProfit += saleProfit;

      console.log(
        `Sale ${sale.id}: Amount=${saleAmount}, Capital=${saleCapital}, Profit=${saleProfit}`
      );
    });

    // Update UI elements
    const totalSalesEl = document.getElementById("daily-total-sales");
    const totalCapitalEl = document.getElementById("daily-total-capital");
    const totalProfitEl = document.getElementById("daily-total-profit");
    const salesCountEl = document.getElementById("daily-sales-count");
    const averageSaleEl = document.getElementById("daily-average-sale");

    console.log("DOM elements found:", {
      totalSalesEl: !!totalSalesEl,
      totalCapitalEl: !!totalCapitalEl,
      totalProfitEl: !!totalProfitEl,
      salesCountEl: !!salesCountEl,
      averageSaleEl: !!averageSaleEl,
    });

    // Check if we're in the sales section
    const salesSection = document.getElementById("sales");
    console.log("Sales section found:", !!salesSection);
    console.log(
      "Sales section visible:",
      salesSection ? !salesSection.classList.contains("hidden") : false
    );

    if (totalSalesEl) {
      totalSalesEl.textContent = `Bs. ${totalSales.toFixed(2)}`;
      console.log("Updated total sales:", totalSales.toFixed(2));
    } else {
      console.error("Element daily-total-sales not found");
    }

    if (totalCapitalEl) {
      totalCapitalEl.textContent = `Bs. ${totalCapital.toFixed(2)}`;
      console.log("Updated total capital:", totalCapital.toFixed(2));
    } else {
      console.error("Element daily-total-capital not found");
    }

    if (totalProfitEl) {
      totalProfitEl.textContent = `Bs. ${totalProfit.toFixed(2)}`;
      console.log("Updated total profit:", totalProfit.toFixed(2));
    } else {
      console.error("Element daily-total-profit not found");
    }

    if (salesCountEl) {
      salesCountEl.textContent = todaySales.length;
      console.log("Updated sales count:", todaySales.length);
    } else {
      console.error("Element daily-sales-count not found");
    }

    if (averageSaleEl) {
      const average =
        todaySales.length > 0 ? totalSales / todaySales.length : 0;
      averageSaleEl.textContent = `Bs. ${average.toFixed(2)}`;
      console.log("Updated average sale:", average.toFixed(2));
    } else {
      console.error("Element daily-average-sale not found");
    }

    console.log("Daily financial summary updated:", {
      totalSales: totalSales.toFixed(2),
      totalCapital: totalCapital.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      salesCount: todaySales.length,
    });
  }

  // Force update financial summary (for debugging)
  forceUpdateFinancialSummary() {
    console.log("=== FORCE UPDATING FINANCIAL SUMMARY ===");
    this.loadSales().then(() => {
      this.loadTodaySales();
    });
  }

  async deleteSale(saleId) {
    try {
      // Confirm deletion
      if (
        !confirm(
          "¿Estás seguro de que quieres eliminar esta venta? Esta acción no se puede deshacer."
        )
      ) {
        return;
      }

      console.log("Deleting sale:", saleId);

      // Find the sale to get its data
      const sale = this.sales.find((s) => s.id === saleId);
      if (!sale) {
        this.showMessage("Venta no encontrada", "error");
        return;
      }

      // Calculate amounts to subtract from cash
      const costAmount = sale.totalCost || sale.cost || 0;
      const profitAmount = sale.totalProfit || sale.profit || 0;

      // Delete the sale from Firebase
      await window.deleteDoc(window.doc(this.db, "sales", saleId));

      // Subtract the amounts from cash (reverse the sale effect)
      await this.reverseCashFromSale(costAmount, profitAmount);

      this.showMessage("Venta y comanda eliminadas correctamente", "success");

      // Reload data
      await this.loadSales();
      this.loadTodaySales();
      this.updateDashboard();

      // Update comandas to reflect the deletion
      this.updateComandasRealTime();
    } catch (error) {
      console.error("Error deleting sale:", error);
      this.showMessage("Error al eliminar la venta", "error");
    }
  }

  async reverseCashFromSale(costAmount, profitAmount) {
    try {
      console.log(
        "Reversing cash from deleted sale - cost:",
        costAmount,
        "profit:",
        profitAmount
      );

      // Get current amounts
      const capitalDoc = await window.getDocs(
        window.collection(this.db, "caja")
      );
      let currentCapital = 0;
      let currentGanancia = 0;

      capitalDoc.forEach((doc) => {
        if (doc.id === "Capital") {
          currentCapital = doc.data().monto || 0;
        } else if (doc.id === "Ganancia") {
          currentGanancia = doc.data().monto || 0;
        }
      });

      // Calculate new amounts (subtract both cost and profit)
      const newCapital = currentCapital - costAmount;
      const newGanancia = currentGanancia - profitAmount;

      // Update Capital document
      await window.updateDoc(window.doc(this.db, "caja", "Capital"), {
        monto: newCapital,
      });

      // Update Ganancia document
      await window.updateDoc(window.doc(this.db, "caja", "Ganancia"), {
        monto: newGanancia,
      });

      console.log(
        "Cash reversed successfully - Capital:",
        newCapital,
        "Ganancia:",
        newGanancia
      );
    } catch (error) {
      console.error("Error reversing cash from sale:", error);
    }
  }

  // Update capital when making a sale (add ingredient costs back to capital)
  async updateCashFromSale(costAmount, profitAmount) {
    try {
      console.log(
        "Updating cash from sale - cost:",
        costAmount,
        "profit:",
        profitAmount
      );

      // Get current amounts
      const capitalDoc = await window.getDocs(
        window.collection(this.db, "caja")
      );
      let currentCapital = 0;
      let currentGanancia = 0;

      capitalDoc.forEach((doc) => {
        if (doc.id === "Capital") {
          currentCapital = doc.data().monto || 0;
        } else if (doc.id === "Ganancia") {
          currentGanancia = doc.data().monto || 0;
        }
      });

      // Calculate new amounts (add both cost and profit)
      const newCapital = currentCapital + costAmount;
      const newGanancia = currentGanancia + profitAmount;

      // Update Capital document
      await window.updateDoc(window.doc(this.db, "caja", "Capital"), {
        monto: newCapital,
      });

      // Update Ganancia document
      await window.updateDoc(window.doc(this.db, "caja", "Ganancia"), {
        monto: newGanancia,
      });
      console.log(
        "Cash updated successfully - Capital:",
        newCapital,
        "Ganancia:",
        newGanancia
      );
    } catch (error) {
      console.error("Error updating cash from sale:", error);
    }
  }

  // Cash Register Functions
  async loadCashRegister() {
    try {
      console.log("Loading cash register data...");

      // Load Capital document
      const capitalDoc = await window.getDocs(
        window.collection(this.db, "caja")
      );
      let currentCapital = 0;
      let currentGanancia = 0;

      capitalDoc.forEach((doc) => {
        if (doc.id === "Capital") {
          currentCapital = doc.data().monto || 0;
        } else if (doc.id === "Ganancia") {
          currentGanancia = doc.data().monto || 0;
        }
      });

      console.log("Current capital:", currentCapital);
      console.log("Current ganancia:", currentGanancia);

      // Update cash register display
      document.getElementById("cash-capital-amount").textContent =
        currentCapital.toFixed(2);
      document.getElementById("cash-profit-amount").textContent =
        currentGanancia.toFixed(2);

      console.log("Updated cash register display");

      // If documents don't exist, initialize them
      if (currentCapital === 0 && currentGanancia === 0) {
        console.log("Initializing Capital and Ganancia documents");
        await this.initializeCashDocuments();
      }

      // Load cash movements
      await this.loadCashMovements();
    } catch (error) {
      console.error("Error loading cash register:", error);
    }
  }

  async initializeCashDocuments() {
    try {
      console.log("Initializing Capital and Ganancia documents...");

      // Create Capital document
      await window.setDoc(window.doc(this.db, "caja", "Capital"), {
        monto: 0,
      });
      console.log("Capital document created with monto: 0");

      // Create Ganancia document
      await window.setDoc(window.doc(this.db, "caja", "Ganancia"), {
        monto: 0,
      });
      console.log("Ganancia document created with monto: 0");

      // Update display directly
      document.getElementById("cash-capital-amount").textContent = "0.00";
      document.getElementById("cash-profit-amount").textContent = "0.00";
    } catch (error) {
      console.error("Error initializing cash documents:", error);
    }
  }

  async loadCashMovements() {
    try {
      const cashMovementsQuery = window.query(
        window.collection(this.db, "movimientos"),
        window.orderBy("createdAt", "desc")
      );
      const cashMovementsSnapshot = await window.getDocs(cashMovementsQuery);

      this.cashMovements = [];
      cashMovementsSnapshot.forEach((doc) => {
        this.cashMovements.push({ id: doc.id, ...doc.data() });
      });

      // Filter only today's movements
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayMovements = this.cashMovements.filter((movement) => {
        let movementDate;
        if (movement.createdAt && movement.createdAt.toDate) {
          movementDate = movement.createdAt.toDate();
        } else if (movement.createdAt) {
          movementDate = new Date(movement.createdAt);
        } else {
          return false;
        }
        movementDate.setHours(0, 0, 0, 0);
        return movementDate.getTime() === today.getTime();
      });

      this.renderCashMovements(todayMovements);
    } catch (error) {
      console.error("Error loading cash movements:", error);
    }
  }

  renderCashMovements(cashMovements) {
    const container = document.getElementById("cash-movement-history-list");

    if (cashMovements.length === 0) {
      container.innerHTML =
        '<p class="text-gray-500 text-center py-8">No hay movimientos hoy</p>';
      return;
    }

    container.innerHTML = cashMovements
      .map((movement) => {
        const date =
          movement.createdAt && movement.createdAt.toDate
            ? movement.createdAt.toDate()
            : new Date(movement.createdAt);
        const timeString = date.toLocaleString();

        const isIncome = movement.type === "income";
        const amountClass = isIncome ? "text-green-600" : "text-red-600";
        const iconClass = isIncome ? "fa-arrow-up" : "fa-arrow-down";
        const bgClass = isIncome
          ? "bg-green-50 border-green-200"
          : "bg-red-50 border-red-200";

        return `
        <div class="p-4 mb-3 ${bgClass} rounded-xl border">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <h4 class="font-semibold text-gray-800">${
                movement.description
              }</h4>
              <p class="text-sm text-gray-600">${timeString}</p>
              <p class="text-xs text-gray-500">Fuente: ${
                movement.source === "capital" ? "Capital" : "Ganancias"
              }</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <div class="text-lg font-bold ${amountClass}">
                  <i class="fas ${iconClass} mr-1"></i>
                  ${isIncome ? "+" : "-"}Bs. ${movement.amount.toFixed(2)}
                </div>
              </div>
              <button onclick="restaurantManager.deleteCashMovement('${
                movement.id
              }')" 
                      class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-sm transition-colors duration-200">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  async deleteCashMovement(movementId) {
    try {
      // Confirm deletion
      if (
        !confirm(
          "¿Estás seguro de que quieres eliminar este movimiento? Esta acción no se puede deshacer."
        )
      ) {
        return;
      }

      console.log("Deleting cash movement:", movementId);

      // Find the movement to get its data
      const movement = this.cashMovements.find((m) => m.id === movementId);
      if (!movement) {
        this.showMessage("Movimiento no encontrado", "error");
        return;
      }

      // Delete the movement from Firebase
      await window.deleteDoc(window.doc(this.db, "movimientos", movementId));

      // Reverse the movement effect on cash
      await this.reverseCashFromMovement(movement);

      this.showMessage("Movimiento eliminado correctamente", "success");

      // Reload data
      await this.loadCashMovements();
      await this.loadCashRegister();
    } catch (error) {
      console.error("Error deleting cash movement:", error);
      this.showMessage("Error al eliminar el movimiento", "error");
    }
  }

  async reverseCashFromMovement(movement) {
    try {
      console.log("Reversing cash from deleted movement:", movement);

      // Get current amounts
      const capitalDoc = await window.getDocs(
        window.collection(this.db, "caja")
      );
      let currentCapital = 0;
      let currentGanancia = 0;

      capitalDoc.forEach((doc) => {
        if (doc.id === "Capital") {
          currentCapital = doc.data().monto || 0;
        } else if (doc.id === "Ganancia") {
          currentGanancia = doc.data().monto || 0;
        }
      });

      // Calculate new amounts (reverse the original movement)
      let newCapital = currentCapital;
      let newGanancia = currentGanancia;

      if (movement.source === "capital") {
        // Reverse the original movement
        newCapital =
          movement.type === "income"
            ? currentCapital - movement.amount
            : currentCapital + movement.amount;

        // Update Capital document
        await window.updateDoc(window.doc(this.db, "caja", "Capital"), {
          monto: newCapital,
        });
      } else if (movement.source === "profit") {
        // Reverse the original movement
        newGanancia =
          movement.type === "income"
            ? currentGanancia - movement.amount
            : currentGanancia + movement.amount;

        // Update Ganancia document
        await window.updateDoc(window.doc(this.db, "caja", "Ganancia"), {
          monto: newGanancia,
        });
      }

      console.log(
        "Cash reversed successfully - Capital:",
        newCapital,
        "Ganancia:",
        newGanancia
      );
    } catch (error) {
      console.error("Error reversing cash from movement:", error);
    }
  }

  showCashMovementForm() {
    document.getElementById("cash-movement-modal").style.display = "block";
  }

  hideCashMovementForm() {
    document.getElementById("cash-movement-modal").style.display = "none";
    document.getElementById("cash-movement-form").reset();
  }

  async saveCashMovement() {
    const formData = {
      type: document.getElementById("movement-type").value,
      amount: parseFloat(document.getElementById("movement-amount").value),
      source: document.getElementById("movement-source").value,
      description: document.getElementById("movement-description").value,
      createdAt: new Date(),
    };

    if (
      !formData.type ||
      !formData.amount ||
      !formData.source ||
      !formData.description
    ) {
      this.showMessage("Por favor completa todos los campos", "error");
      return;
    }

    try {
      // Save cash movement
      await window.addDoc(window.collection(this.db, "movimientos"), formData);

      // Update cash (capital or ganancia) based on source and type
      await this.updateCashFromMovement(
        formData.source,
        formData.type,
        formData.amount,
        formData.description
      );

      this.showMessage(
        "Movimiento de caja registrado correctamente",
        "success"
      );
      this.hideCashMovementForm();
      this.loadCashRegister();
      this.updateDashboard();
    } catch (error) {
      console.error("Error saving cash movement:", error);
      this.showMessage("Error al registrar el movimiento", "error");
    }
  }

  async updateCashFromMovement(source, type, amount, description) {
    try {
      // Get current amounts
      const capitalDoc = await window.getDocs(
        window.collection(this.db, "caja")
      );
      let currentCapital = 0;
      let currentGanancia = 0;

      capitalDoc.forEach((doc) => {
        if (doc.id === "Capital") {
          currentCapital = doc.data().monto || 0;
        } else if (doc.id === "Ganancia") {
          currentGanancia = doc.data().monto || 0;
        }
      });

      // Calculate new amounts
      let newCapital = currentCapital;
      let newGanancia = currentGanancia;

      if (source === "capital") {
        newCapital =
          type === "income" ? currentCapital + amount : currentCapital - amount;

        // Update Capital document
        await window.updateDoc(window.doc(this.db, "caja", "Capital"), {
          monto: newCapital,
        });
      } else if (source === "profit") {
        newGanancia =
          type === "income"
            ? currentGanancia + amount
            : currentGanancia - amount;

        // Update Ganancia document
        await window.updateDoc(window.doc(this.db, "caja", "Ganancia"), {
          monto: newGanancia,
        });
      }
    } catch (error) {
      console.error("Error updating cash from movement:", error);
    }
  }

  // Real-time comandas update
  updateComandasRealTime() {
    // Check if comandas view is currently active
    const comandasView = document.getElementById("comandas-view");
    if (comandasView && !comandasView.classList.contains("hidden")) {
      console.log(
        "Updating comandas real-time with",
        this.sales.length,
        "sales"
      );
      // Call the global function to update comandas display with current sales data
      if (window.updateComandasDisplay) {
        // Use a small delay to ensure data is fully loaded
        setTimeout(() => {
          // Create a copy of sales to avoid reference issues
          const salesCopy = [...this.sales];
          window.updateComandasDisplay(salesCopy);
          // Show a visual notification that a new order was added
          this.showComandaNotification();
        }, 100);
      }
    }
  }

  // Show notification for new comanda
  showComandaNotification() {
    // Mostrar notificación visual en la app
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 left-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce";
    notification.innerHTML = `
      <div class="flex items-center">
        <i class="fas fa-bell mr-2"></i>
        <span class="font-semibold">¡Nueva Comanda Agregada!</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);

    // Enviar notificación push si está disponible
    if (
      window.sendComandaNotification &&
      this.currentSaleItems &&
      this.currentSaleItems.length > 0
    ) {
      const latestSale =
        this.currentSaleItems[this.currentSaleItems.length - 1];
      const comandaData = {
        id: Date.now(), // ID temporal
        orderNumber: this.sales.length + 1,
        dishName: latestSale.dishName,
        total: latestSale.totalPrice || latestSale.price,
      };

      window.sendComandaNotification(comandaData);
    }
  }

  // Mark order as completed
  async completeOrder(saleId) {
    try {
      // Update the sale status to 'completed'
      await window.updateDoc(window.doc(this.db, "sales", saleId), {
        status: "completed",
        completedAt: new Date(),
      });

      // Show success message
      this.showMessage("Orden marcada como completada", "success");

      // Reload sales data
      await this.loadSales();

      // Update comandas if active
      this.updateComandasRealTime();

      // Update dashboard
      this.updateDashboard();
    } catch (error) {
      console.error("Error completing order:", error);
      this.showMessage("Error al completar la orden", "error");
    }
  }
}

// Initialize the application
let restaurantManager;
document.addEventListener("DOMContentLoaded", () => {
  restaurantManager = new RestaurantManager();

  // Make debugging functions available globally
  window.forceUpdateFinancialSummary = () =>
    restaurantManager.forceUpdateFinancialSummary();
});
