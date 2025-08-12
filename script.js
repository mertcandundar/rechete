// STORAGE
let ingredients = JSON.parse(localStorage.getItem('ingredients') || '[]');
let recipes = JSON.parse(localStorage.getItem('recipes') || '[]');

// LOGIN
const loginPage = document.getElementById('loginPage');
const appContainer = document.getElementById('appContainer');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if(username === 'admin' && password === 'admin'){
    loginError.classList.add('d-none');
    loginPage.classList.add('d-none');
    appContainer.classList.remove('d-none');
    showPage('home');
  } else {
    loginError.classList.remove('d-none');
  }
});

function logout(){
  appContainer.classList.add('d-none');
  loginPage.classList.remove('d-none');
  loginForm.reset();
}

// PAGE NAVIGATION
function showPage(pageId){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active-page'));
  document.getElementById(pageId).classList.add('active-page');
}

// INGREDIENTS PAGE
const ingredientListEl = document.getElementById('ingredientList');
const ingredientForm = document.getElementById('ingredientForm');
const searchIngredients = document.getElementById('searchIngredients');

const ingredientModal = new bootstrap.Modal(document.getElementById('ingredientModal'));
const ingredientModalForm = document.getElementById('ingredientModalForm');
const modalIngredientName = document.getElementById('modalIngredientName');
const modalIngredientWeight = document.getElementById('modalIngredientWeight');
const modalIngredientCost = document.getElementById('modalIngredientCost');

let activeIngredientIndex = null;

function renderIngredients(filter=''){
  ingredientListEl.innerHTML = '';
  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()));
  filtered.forEach((item, index) => {
    const unitCost = (item.cost / item.weight).toFixed(2);
    ingredientListEl.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${item.name}</td>
        <td>${item.weight}</td>
        <td>${item.cost}</td>
        <td>${unitCost}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="openIngredientEditModal(${index})">Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteIngredient(${index})">Delete</button>
        </td>
      </tr>
    `);
  });
}

ingredientForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('ingredientName').value.trim();
  const weight = parseFloat(document.getElementById('ingredientWeight').value);
  const cost = parseFloat(document.getElementById('ingredientCost').value);
  if (!name || isNaN(weight) || weight <= 0 || isNaN(cost) || cost <= 0) return alert('Please enter valid values.');

  ingredients.push({name, weight, cost});
  saveIngredients();
  ingredientForm.reset();
  renderIngredients();
  updateRecipeIngredientSelects();
});

searchIngredients.addEventListener('input', e => {
  renderIngredients(e.target.value);
});

function openIngredientEditModal(index){
  activeIngredientIndex = index;
  const item = ingredients[index];
  modalIngredientName.value = item.name;
  modalIngredientWeight.value = item.weight;
  modalIngredientCost.value = item.cost;
  ingredientModal.show();
}

ingredientModalForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = modalIngredientName.value.trim();
  const weight = parseFloat(modalIngredientWeight.value);
  const cost = parseFloat(modalIngredientCost.value);
  if (!name || isNaN(weight) || weight <= 0 || isNaN(cost) || cost <= 0) return alert('Please enter valid values.');

  ingredients[activeIngredientIndex] = {name, weight, cost};
  saveIngredients();
  renderIngredients();
  updateRecipeIngredientSelects();
  ingredientModal.hide();
});

function deleteIngredient(index){
  if(!confirm('Delete this ingredient?')) return;
  ingredients.splice(index,1);
  saveIngredients();
  renderIngredients();
  updateRecipeIngredientSelects();
}

function saveIngredients(){
  localStorage.setItem('ingredients', JSON.stringify(ingredients));
}

// EXCEL IMPORT - Ingredients
const excelFileInput = document.getElementById('excelFileInput');

excelFileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, {type: 'array'});
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ''});
    
    let addedCount = 0;
    jsonData.forEach(row => {
      // Expected columns: Name, Package Weight, Package Cost
      const name = row['Name'] || row['name'];
      const weight = parseFloat(row['Package Weight'] || row['package weight'] || row['Weight'] || row['weight']);
      const cost = parseFloat(row['Package Cost'] || row['package cost'] || row['Cost'] || row['cost']);

      if(name && !isNaN(weight) && weight > 0 && !isNaN(cost) && cost > 0){
        // Add only if not duplicate name
        if(!ingredients.some(i => i.name.toLowerCase() === name.toLowerCase())){
          ingredients.push({name, weight, cost});
          addedCount++;
        }
      }
    });

    saveIngredients();
    renderIngredients();
    updateRecipeIngredientSelects();
    alert(`Added ${addedCount} ingredients from Excel.`);
    e.target.value = '';
  };
  reader.readAsArrayBuffer(file);
});

// DOWNLOAD INGREDIENTS AS EXCEL
const downloadExcelBtn = document.getElementById('downloadExcelBtn');
downloadExcelBtn.addEventListener('click', () => {
  if(ingredients.length === 0) return alert('No ingredients to download.');
  const ws = XLSX.utils.json_to_sheet(ingredients.map(i => ({
    Name: i.name,
    'Package Weight': i.weight,
    'Package Cost': i.cost,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ingredients');
  XLSX.writeFile(wb, 'ingredients.xlsx');
});

// RECIPES PAGE
const recipeListEl = document.getElementById('recipeList');
const searchRecipes = document.getElementById('searchRecipes');
const recipeForm = document.getElementById('recipeForm');

const recipeModal = new bootstrap.Modal(document.getElementById('recipeModal'));
const recipeModalForm = document.getElementById('recipeModalForm');
const modalRecipeName = document.getElementById('modalRecipeName');
const modalRecipePortions = document.getElementById('modalRecipePortions');
const recipeIngredientSelect = document.getElementById('recipeIngredientSelect');
const recipeIngredientAmount = document.getElementById('recipeIngredientAmount');
const addIngredientToRecipeBtn = document.getElementById('addIngredientToRecipe');
const recipeIngredientList = document.getElementById('recipeIngredientList');
const recipeTotalCostEl = document.getElementById('recipeTotalCost');

let activeRecipeIndex = null;

function renderRecipes(filter=''){
  recipeListEl.innerHTML = '';

  const filtered = recipes.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));
  if(filtered.length === 0){
    recipeListEl.innerHTML = '<p>No recipes found.</p>';
    return;
  }

  filtered.forEach((recipe, index) => {
    recipeListEl.insertAdjacentHTML('beforeend', `
      <div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center">
          <strong>${recipe.name}</strong>
          <div>
            <button class="btn btn-sm btn-warning me-2" onclick="openRecipeEditModal(${index})">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="deleteRecipe(${index})">Delete</button>
          </div>
        </div>
        <div class="card-body">
          <p>Portions: ${recipe.portions}</p>
          <p>Ingredients (${recipe.ingredients.length}):</p>
          <ul>
            ${recipe.ingredients.map(ing => {
              const ingredientData = ingredients.find(i => i.name === ing.name);
              const unitCost = ingredientData ? ingredientData.cost / ingredientData.weight : 0;
              const totalCost = unitCost * ing.amount;
              return `<li>${ing.name} - ${ing.amount} units - Cost: ${totalCost.toFixed(2)}</li>`;
            }).join('')}
          </ul>
          <p><strong>Total Recipe Cost: ${calculateRecipeCost(recipe).toFixed(2)}</strong></p>
        </div>
      </div>
    `);
  });
}

searchRecipes.addEventListener('input', e => {
  renderRecipes(e.target.value);
});

recipeForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('recipeName').value.trim();
  const portions = parseInt(document.getElementById('recipePortions').value);
  if(!name || isNaN(portions) || portions < 1) return alert('Please enter valid values.');

  const newRecipe = {name, portions, ingredients: []};
  recipes.push(newRecipe);
  saveRecipes();
  renderRecipes();
  recipeForm.reset();
});

function openRecipeEditModal(index){
  activeRecipeIndex = index;
  const recipe = recipes[index];
  modalRecipeName.value = recipe.name;
  modalRecipePortions.value = recipe.portions;
  recipeIngredientList.innerHTML = '';
  recipe.ingredients.forEach(ing => {
    addIngredientRow(ing.name, ing.amount);
  });
  updateRecipeTotalCost();
  recipeModal.show();
}

recipeModalForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = modalRecipeName.value.trim();
  const portions = parseInt(modalRecipePortions.value);
  if(!name || isNaN(portions) || portions < 1) return alert('Please enter valid values.');

  const ingredientsInRecipe = [];
  recipeIngredientList.querySelectorAll('tr').forEach(row => {
    const ingName = row.querySelector('.ing-name').textContent;
    const amount = parseFloat(row.querySelector('.ing-amount').value);
    if(ingName && !isNaN(amount) && amount > 0){
      ingredientsInRecipe.push({name: ingName, amount});
    }
  });

  if(ingredientsInRecipe.length === 0) return alert('Add at least one ingredient.');

  recipes[activeRecipeIndex] = {name, portions, ingredients: ingredientsInRecipe};
  saveRecipes();
  renderRecipes();
  renderCosts();
  updateRecipeIngredientSelects();
  recipeModal.hide();
});

function deleteRecipe(index){
  if(!confirm('Delete this recipe?')) return;
  recipes.splice(index,1);
  saveRecipes();
  renderRecipes();
  renderCosts();
  updateRecipeIngredientSelects();
}

// EXCEL IMPORT - Recipes
const excelRecipeInput = document.getElementById('excelRecipeInput');

excelRecipeInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, {type: 'array'});
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {defval: ''});

    // Expect columns: RecipeName, Portions, IngredientName, Amount
    // Group by RecipeName
    const grouped = {};
    jsonData.forEach(row => {
      const rName = row['RecipeName'] || row['recipeName'] || row['recipe'] || row['Recipe'] || '';
      const portions = parseInt(row['Portions'] || row['portions']) || 1;
      const ingName = row['IngredientName'] || row['ingredientName'] || row['Ingredient'] || '';
      const amount = parseFloat(row['Amount'] || row['amount']) || 0;

      if(rName && ingName && amount > 0){
        if(!grouped[rName]){
          grouped[rName] = {name: rName, portions: portions, ingredients: []};
        }
        grouped[rName].ingredients.push({name: ingName, amount});
      }
    });

    // Merge or add
    let addedCount = 0;
    Object.values(grouped).forEach(newRecipe => {
      const existingIndex = recipes.findIndex(r => r.name.toLowerCase() === newRecipe.name.toLowerCase());
      if(existingIndex >= 0){
        // Replace existing recipe completely
        recipes[existingIndex] = newRecipe;
      } else {
        recipes.push(newRecipe);
      }
      addedCount++;
    });

    saveRecipes();
    renderRecipes();
    renderCosts();
    updateRecipeIngredientSelects();
    alert(`Imported/updated ${addedCount} recipes from Excel.`);
    e.target.value = '';
  };
  reader.readAsArrayBuffer(file);
});

// DOWNLOAD RECIPES AS EXCEL
const downloadRecipeExcelBtn = document.getElementById('downloadRecipeExcelBtn');
downloadRecipeExcelBtn.addEventListener('click', () => {
  if(recipes.length === 0) return alert('No recipes to download.');
  
  // Flatten recipes into rows: RecipeName, Portions, IngredientName, Amount
  const rows = [];
  recipes.forEach(r => {
    r.ingredients.forEach(ing => {
      rows.push({
        RecipeName: r.name,
        Portions: r.portions,
        IngredientName: ing.name,
        Amount: ing.amount
      });
    });
    if(r.ingredients.length === 0){
      rows.push({
        RecipeName: r.name,
        Portions: r.portions,
        IngredientName: '',
        Amount: ''
      });
    }
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recipes');
  XLSX.writeFile(wb, 'recipes.xlsx');
});

// RECIPE INGREDIENTS LOGIC (Modal ingredient list)
function addIngredientRow(name, amount){
  // Prevent duplicates
  const existingRow = Array.from(recipeIngredientList.children).find(row => row.querySelector('.ing-name').textContent === name);
  if(existingRow){
    alert('Ingredient already added.');
    return;
  }

  const ingredientData = ingredients.find(i => i.name === name);
  const unitCost = ingredientData ? (ingredientData.cost / ingredientData.weight).toFixed(2) : '0.00';
  const totalCost = ingredientData ? (unitCost * amount).toFixed(2) : '0.00';

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="ing-name">${name}</td>
    <td><input type="number" min="0.01" step="0.01" class="form-control ing-amount" value="${amount}" /></td>
    <td>${unitCost}</td>
    <td class="total-cost">${totalCost}</td>
    <td><button type="button" class="btn btn-sm btn-danger btn-remove">Remove</button></td>
  `;

  tr.querySelector('.ing-amount').addEventListener('input', e => {
    let val = parseFloat(e.target.value);
    if(isNaN(val) || val <= 0) val = 0;
    const newTotal = (unitCost * val).toFixed(2);
    tr.querySelector('.total-cost').textContent = newTotal;
    updateRecipeTotalCost();
  });

  tr.querySelector('.btn-remove').addEventListener('click', () => {
    tr.remove();
    updateRecipeTotalCost();
  });

  recipeIngredientList.appendChild(tr);
}

function updateRecipeTotalCost(){
  let total = 0;
  recipeIngredientList.querySelectorAll('tr').forEach(tr => {
    total += parseFloat(tr.querySelector('.total-cost').textContent) || 0;
  });
  recipeTotalCostEl.textContent = total.toFixed(2);
}

function updateRecipeIngredientSelects(){
  recipeIngredientSelect.innerHTML = '<option value="" selected>Select Ingredient</option>';
  ingredients.forEach(i => {
    recipeIngredientSelect.insertAdjacentHTML('beforeend', `<option value="${i.name}">${i.name}</option>`);
  });
}

// COSTS PAGE
const costList = document.getElementById('costList');
const searchCosts = document.getElementById('searchCosts');

function renderCosts(filter=''){
  costList.innerHTML = '';
  const filtered = recipes.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));

  if(filtered.length === 0){
    costList.innerHTML = '<tr><td colspan="4" class="text-center">No recipes found.</td></tr>';
    return;
  }

  filtered.forEach(recipe => {
    const totalCost = calculateRecipeCost(recipe);
    const portions = recipe.portions || 1;
    const costPerPortion = portions > 0 ? totalCost / portions : totalCost;
    costList.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${recipe.name}</td>
        <td>${portions}</td>
        <td>${costPerPortion.toFixed(2)}</td>
        <td>${totalCost.toFixed(2)}</td>
      </tr>
    `);
  });
}

searchCosts.addEventListener('input', e => {
  renderCosts(e.target.value);
});

// UTILITIES
function calculateRecipeCost(recipe){
  let total = 0;
  recipe.ingredients.forEach(ing => {
    const ingredientData = ingredients.find(i => i.name === ing.name);
    if(ingredientData){
      const unitCost = ingredientData.cost / ingredientData.weight;
      total += unitCost * ing.amount;
    }
  });
  return total;
}

function saveRecipes(){
  localStorage.setItem('recipes', JSON.stringify(recipes));
}

function saveIngredients(){
  localStorage.setItem('ingredients', JSON.stringify(ingredients));
}

// INITIALIZE
renderIngredients();
renderRecipes();
renderCosts();
updateRecipeIngredientSelects();
