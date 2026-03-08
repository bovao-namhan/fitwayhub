import { useState, useMemo, type CSSProperties } from "react";
import { Search, ChevronDown, ChevronUp, Utensils, Leaf, Apple, Drumstick, Egg, Fish, Wheat, X, Plus, Minus, PieChart } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   MEAL DATABASE — 200+ items across 8 categories
   Each item: per standard serving
   ═══════════════════════════════════════════════════════════════ */

export type MealCategory = "protein" | "grains" | "vegetables" | "fruits" | "dairy" | "legumes" | "snacks" | "meals";

export interface MealItem {
  id: number;
  name: string;
  category: MealCategory;
  serving: string;        // e.g. "100g", "1 cup", "1 piece"
  servingGrams: number;
  calories: number;
  protein: number;        // grams
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;         // mg
  tags: string[];         // for matching
  pairsWith: number[];    // IDs of recommended pairings
  emoji: string;
}

const DB: MealItem[] = [
  // ═══════ PROTEIN (30 items) ═══════
  { id: 1, name: "Grilled Chicken Breast", category: "protein", serving: "150g", servingGrams: 150, calories: 248, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0, sugar: 0, sodium: 104, tags: ["lean", "high-protein"], pairsWith: [101, 102, 111, 131, 151], emoji: "🍗" },
  { id: 2, name: "Grilled Salmon Fillet", category: "protein", serving: "150g", servingGrams: 150, calories: 312, protein: 34, carbs: 0, fat: 18.6, fiber: 0, sugar: 0, sodium: 86, tags: ["omega-3", "fish"], pairsWith: [101, 103, 112, 132, 152], emoji: "🐟" },
  { id: 3, name: "Lean Ground Beef (95%)", category: "protein", serving: "150g", servingGrams: 150, calories: 232, protein: 35.6, carbs: 0, fat: 9, fiber: 0, sugar: 0, sodium: 102, tags: ["beef", "iron"], pairsWith: [101, 104, 113, 131, 153], emoji: "🥩" },
  { id: 4, name: "Turkey Breast (Roasted)", category: "protein", serving: "150g", servingGrams: 150, calories: 220, protein: 42, carbs: 0, fat: 4.5, fiber: 0, sugar: 0, sodium: 90, tags: ["lean", "poultry"], pairsWith: [101, 102, 111, 132, 154], emoji: "🦃" },
  { id: 5, name: "Tuna Steak (Grilled)", category: "protein", serving: "150g", servingGrams: 150, calories: 237, protein: 38.5, carbs: 0, fat: 8.1, fiber: 0, sugar: 0, sodium: 66, tags: ["fish", "lean"], pairsWith: [101, 103, 112, 133, 155], emoji: "🐟" },
  { id: 6, name: "Shrimp (Grilled)", category: "protein", serving: "150g", servingGrams: 150, calories: 143, protein: 30, carbs: 1.5, fat: 1.5, fiber: 0, sugar: 0, sodium: 300, tags: ["seafood", "lean"], pairsWith: [101, 103, 113, 131, 152], emoji: "🦐" },
  { id: 7, name: "Eggs (Whole, Boiled)", category: "protein", serving: "2 large", servingGrams: 100, calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124, tags: ["eggs", "versatile"], pairsWith: [104, 105, 131, 134, 156], emoji: "🥚" },
  { id: 8, name: "Egg Whites (Cooked)", category: "protein", serving: "4 whites", servingGrams: 132, calories: 68, protein: 14.4, carbs: 0.96, fat: 0.24, fiber: 0, sugar: 0.96, sodium: 220, tags: ["lean", "low-cal"], pairsWith: [104, 105, 131, 134, 156], emoji: "🥚" },
  { id: 9, name: "Lamb Chop (Grilled)", category: "protein", serving: "150g", servingGrams: 150, calories: 362, protein: 35, carbs: 0, fat: 24, fiber: 0, sugar: 0, sodium: 96, tags: ["lamb", "iron"], pairsWith: [101, 102, 111, 131, 153], emoji: "🍖" },
  { id: 10, name: "Pork Tenderloin", category: "protein", serving: "150g", servingGrams: 150, calories: 206, protein: 36, carbs: 0, fat: 6, fiber: 0, sugar: 0, sodium: 80, tags: ["pork", "lean"], pairsWith: [101, 104, 112, 132, 154], emoji: "🥩" },
  { id: 11, name: "Chicken Thigh (Skinless)", category: "protein", serving: "150g", servingGrams: 150, calories: 270, protein: 36, carbs: 0, fat: 13.5, fiber: 0, sugar: 0, sodium: 120, tags: ["poultry"], pairsWith: [101, 102, 111, 131, 155], emoji: "🍗" },
  { id: 12, name: "Duck Breast (Skinless)", category: "protein", serving: "150g", servingGrams: 150, calories: 280, protein: 37, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 92, tags: ["poultry", "rich"], pairsWith: [101, 103, 113, 133, 152], emoji: "🦆" },
  { id: 13, name: "Cod Fillet (Baked)", category: "protein", serving: "150g", servingGrams: 150, calories: 140, protein: 30.5, carbs: 0, fat: 1.2, fiber: 0, sugar: 0, sodium: 93, tags: ["fish", "lean", "white-fish"], pairsWith: [101, 103, 112, 131, 154], emoji: "🐟" },
  { id: 14, name: "Tilapia (Grilled)", category: "protein", serving: "150g", servingGrams: 150, calories: 162, protein: 33.6, carbs: 0, fat: 2.7, fiber: 0, sugar: 0, sodium: 78, tags: ["fish", "lean"], pairsWith: [101, 103, 111, 132, 155], emoji: "🐟" },
  { id: 15, name: "Tofu (Firm)", category: "protein", serving: "150g", servingGrams: 150, calories: 120, protein: 14.4, carbs: 3, fat: 6.6, fiber: 1.2, sugar: 0.9, sodium: 21, tags: ["vegan", "soy"], pairsWith: [101, 102, 113, 131, 156], emoji: "🧊" },
  { id: 16, name: "Tempeh", category: "protein", serving: "100g", servingGrams: 100, calories: 192, protein: 20.3, carbs: 7.6, fat: 10.8, fiber: 4, sugar: 0, sodium: 14, tags: ["vegan", "fermented"], pairsWith: [101, 102, 111, 133, 152], emoji: "🫘" },
  { id: 17, name: "Seitan", category: "protein", serving: "100g", servingGrams: 100, calories: 148, protein: 28, carbs: 6, fat: 1.5, fiber: 0.5, sugar: 0, sodium: 180, tags: ["vegan", "wheat-gluten"], pairsWith: [101, 103, 112, 131, 153], emoji: "🌾" },
  { id: 18, name: "Cottage Cheese (Low-fat)", category: "protein", serving: "1 cup", servingGrams: 226, calories: 183, protein: 28, carbs: 6.2, fat: 5, fiber: 0, sugar: 6.2, sodium: 706, tags: ["dairy", "casein"], pairsWith: [151, 152, 153, 154, 155], emoji: "🧀" },
  { id: 19, name: "Greek Yogurt (0% Fat)", category: "protein", serving: "170g", servingGrams: 170, calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, sugar: 4, sodium: 56, tags: ["dairy", "probiotic"], pairsWith: [151, 152, 153, 154, 155], emoji: "🥛" },
  { id: 20, name: "Whey Protein Shake", category: "protein", serving: "1 scoop + water", servingGrams: 35, calories: 120, protein: 24, carbs: 3, fat: 1.5, fiber: 0, sugar: 1, sodium: 80, tags: ["supplement"], pairsWith: [151, 153, 156], emoji: "🥤" },
  { id: 21, name: "Canned Tuna (in water)", category: "protein", serving: "1 can (140g)", servingGrams: 140, calories: 128, protein: 28, carbs: 0, fat: 1.4, fiber: 0, sugar: 0, sodium: 420, tags: ["fish", "convenient"], pairsWith: [104, 105, 131, 134], emoji: "🥫" },
  { id: 22, name: "Beef Steak (Sirloin)", category: "protein", serving: "200g", servingGrams: 200, calories: 356, protein: 48, carbs: 0, fat: 16, fiber: 0, sugar: 0, sodium: 110, tags: ["beef", "iron"], pairsWith: [101, 102, 111, 131, 153], emoji: "🥩" },
  { id: 23, name: "Chicken Sausage", category: "protein", serving: "2 links (100g)", servingGrams: 100, calories: 168, protein: 17, carbs: 2, fat: 10, fiber: 0, sugar: 1, sodium: 620, tags: ["processed", "poultry"], pairsWith: [104, 105, 131, 134, 156], emoji: "🌭" },
  { id: 24, name: "Salmon (Smoked)", category: "protein", serving: "80g", servingGrams: 80, calories: 133, protein: 18.3, carbs: 0, fat: 6.4, fiber: 0, sugar: 0, sodium: 600, tags: ["fish", "omega-3"], pairsWith: [104, 105, 131, 134], emoji: "🐟" },
  { id: 25, name: "Sardines (Canned)", category: "protein", serving: "1 can (92g)", servingGrams: 92, calories: 191, protein: 22.6, carbs: 0, fat: 10.5, fiber: 0, sugar: 0, sodium: 382, tags: ["fish", "calcium"], pairsWith: [104, 105, 131, 134], emoji: "🐟" },
  { id: 26, name: "Bison (Grilled)", category: "protein", serving: "150g", servingGrams: 150, calories: 194, protein: 38.4, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 78, tags: ["lean", "iron"], pairsWith: [101, 102, 111, 131, 153], emoji: "🦬" },
  { id: 27, name: "Venison (Roasted)", category: "protein", serving: "150g", servingGrams: 150, calories: 210, protein: 40.5, carbs: 0, fat: 4.5, fiber: 0, sugar: 0, sodium: 70, tags: ["lean", "game"], pairsWith: [101, 102, 113, 132, 152], emoji: "🦌" },
  { id: 28, name: "Scallops (Seared)", category: "protein", serving: "150g", servingGrams: 150, calories: 150, protein: 28.5, carbs: 4.2, fat: 1.2, fiber: 0, sugar: 0, sodium: 276, tags: ["seafood", "lean"], pairsWith: [101, 103, 112, 131, 155], emoji: "🦪" },
  { id: 29, name: "Octopus (Grilled)", category: "protein", serving: "150g", servingGrams: 150, calories: 207, protein: 37.5, carbs: 6.6, fat: 3, fiber: 0, sugar: 0, sodium: 348, tags: ["seafood"], pairsWith: [101, 103, 113, 133, 154], emoji: "🐙" },
  { id: 30, name: "Crab Meat", category: "protein", serving: "100g", servingGrams: 100, calories: 97, protein: 19.4, carbs: 0, fat: 1.5, fiber: 0, sugar: 0, sodium: 332, tags: ["seafood", "lean"], pairsWith: [101, 103, 111, 131, 152], emoji: "🦀" },

  // ═══════ GRAINS & CARBS (25 items) ═══════
  { id: 101, name: "Brown Rice (Cooked)", category: "grains", serving: "1 cup (195g)", servingGrams: 195, calories: 216, protein: 5, carbs: 45, fat: 1.8, fiber: 3.5, sugar: 0.7, sodium: 10, tags: ["whole-grain", "gluten-free"], pairsWith: [1, 2, 3, 6, 15], emoji: "🍚" },
  { id: 102, name: "White Rice (Cooked)", category: "grains", serving: "1 cup (186g)", servingGrams: 186, calories: 242, protein: 4.4, carbs: 53, fat: 0.4, fiber: 0.6, sugar: 0, sodium: 0, tags: ["refined", "gluten-free"], pairsWith: [1, 2, 4, 9, 11], emoji: "🍚" },
  { id: 103, name: "Quinoa (Cooked)", category: "grains", serving: "1 cup (185g)", servingGrams: 185, calories: 222, protein: 8.1, carbs: 39.4, fat: 3.6, fiber: 5.2, sugar: 1.6, sodium: 13, tags: ["complete-protein", "gluten-free"], pairsWith: [2, 5, 6, 13, 15], emoji: "🌾" },
  { id: 104, name: "Whole Wheat Bread", category: "grains", serving: "2 slices (60g)", servingGrams: 60, calories: 160, protein: 6.4, carbs: 28, fat: 2.4, fiber: 4, sugar: 4, sodium: 260, tags: ["whole-grain", "fiber"], pairsWith: [7, 8, 21, 23, 24], emoji: "🍞" },
  { id: 105, name: "Oatmeal (Cooked)", category: "grains", serving: "1 cup (234g)", servingGrams: 234, calories: 166, protein: 5.9, carbs: 28.1, fat: 3.6, fiber: 4, sugar: 0.6, sodium: 9, tags: ["whole-grain", "breakfast"], pairsWith: [7, 18, 19, 151, 153], emoji: "🥣" },
  { id: 106, name: "Sweet Potato (Baked)", category: "grains", serving: "1 medium (150g)", servingGrams: 150, calories: 138, protein: 3.1, carbs: 32, fat: 0.2, fiber: 4.8, sugar: 10, sodium: 54, tags: ["complex-carb", "vitamin-a"], pairsWith: [1, 3, 4, 10, 11], emoji: "🍠" },
  { id: 107, name: "Regular Potato (Baked)", category: "grains", serving: "1 medium (173g)", servingGrams: 173, calories: 161, protein: 4.3, carbs: 37, fat: 0.2, fiber: 3.8, sugar: 2, sodium: 17, tags: ["starchy", "potassium"], pairsWith: [1, 3, 9, 10, 22], emoji: "🥔" },
  { id: 108, name: "Whole Wheat Pasta (Cooked)", category: "grains", serving: "1 cup (140g)", servingGrams: 140, calories: 174, protein: 7.5, carbs: 37, fat: 0.8, fiber: 6.3, sugar: 0.8, sodium: 4, tags: ["whole-grain", "pasta"], pairsWith: [1, 3, 6, 11, 15], emoji: "🍝" },
  { id: 109, name: "White Pasta (Cooked)", category: "grains", serving: "1 cup (140g)", servingGrams: 140, calories: 196, protein: 7.2, carbs: 38.3, fat: 1.2, fiber: 1.8, sugar: 0.6, sodium: 1, tags: ["refined", "pasta"], pairsWith: [1, 3, 6, 11, 14], emoji: "🍝" },
  { id: 110, name: "Basmati Rice (Cooked)", category: "grains", serving: "1 cup (186g)", servingGrams: 186, calories: 210, protein: 4.3, carbs: 46.5, fat: 0.4, fiber: 0.7, sugar: 0, sodium: 2, tags: ["aromatic", "gluten-free"], pairsWith: [1, 2, 4, 6, 9], emoji: "🍚" },
  { id: 111, name: "Couscous (Cooked)", category: "grains", serving: "1 cup (157g)", servingGrams: 157, calories: 176, protein: 6, carbs: 36.5, fat: 0.3, fiber: 2.2, sugar: 0.2, sodium: 8, tags: ["semolina"], pairsWith: [1, 4, 9, 11, 12], emoji: "🌾" },
  { id: 112, name: "Bulgur (Cooked)", category: "grains", serving: "1 cup (182g)", servingGrams: 182, calories: 151, protein: 5.6, carbs: 34, fat: 0.4, fiber: 8.2, sugar: 0.2, sodium: 9, tags: ["whole-grain", "high-fiber"], pairsWith: [2, 5, 13, 14, 28], emoji: "🌾" },
  { id: 113, name: "Farro (Cooked)", category: "grains", serving: "1 cup (170g)", servingGrams: 170, calories: 220, protein: 8, carbs: 47, fat: 1.5, fiber: 8, sugar: 0, sodium: 6, tags: ["ancient-grain"], pairsWith: [3, 6, 12, 27, 29], emoji: "🌾" },
  { id: 114, name: "Corn Tortilla", category: "grains", serving: "2 tortillas (52g)", servingGrams: 52, calories: 112, protein: 2.8, carbs: 22.8, fat: 1.4, fiber: 3.2, sugar: 0.4, sodium: 24, tags: ["gluten-free", "mexican"], pairsWith: [1, 3, 6, 131, 164], emoji: "🌮" },
  { id: 115, name: "Flour Tortilla", category: "grains", serving: "1 large (64g)", servingGrams: 64, calories: 200, protein: 5.4, carbs: 33, fat: 5, fiber: 1.8, sugar: 2, sodium: 380, tags: ["wrap"], pairsWith: [1, 3, 7, 131, 164], emoji: "🫓" },
  { id: 116, name: "Pita Bread (Whole Wheat)", category: "grains", serving: "1 pita (64g)", servingGrams: 64, calories: 170, protein: 6.3, carbs: 35, fat: 1.7, fiber: 4.7, sugar: 1, sodium: 340, tags: ["whole-grain"], pairsWith: [1, 7, 15, 131, 162], emoji: "🫓" },
  { id: 117, name: "Naan Bread", category: "grains", serving: "1 piece (90g)", servingGrams: 90, calories: 262, protein: 8.7, carbs: 45, fat: 5.1, fiber: 1.8, sugar: 3.6, sodium: 418, tags: ["indian"], pairsWith: [1, 3, 9, 162, 164], emoji: "🫓" },
  { id: 118, name: "Granola", category: "grains", serving: "½ cup (60g)", servingGrams: 60, calories: 279, protein: 6, carbs: 36, fat: 12, fiber: 4, sugar: 12, sodium: 15, tags: ["breakfast", "crunchy"], pairsWith: [19, 151, 152, 153, 155], emoji: "🥣" },
  { id: 119, name: "Rice Cakes", category: "grains", serving: "3 cakes (27g)", servingGrams: 27, calories: 105, protein: 2.2, carbs: 22, fat: 0.8, fiber: 0.4, sugar: 0.1, sodium: 87, tags: ["low-cal", "snack"], pairsWith: [18, 19, 161, 164, 171], emoji: "🍘" },
  { id: 120, name: "Muesli", category: "grains", serving: "½ cup (55g)", servingGrams: 55, calories: 192, protein: 5.2, carbs: 33, fat: 5.5, fiber: 4, sugar: 10, sodium: 10, tags: ["breakfast"], pairsWith: [19, 151, 152, 153, 155], emoji: "🥣" },
  { id: 121, name: "Corn on the Cob", category: "grains", serving: "1 ear (150g)", servingGrams: 150, calories: 132, protein: 5, carbs: 29, fat: 1.8, fiber: 3, sugar: 5, sodium: 22, tags: ["vegetable", "starchy"], pairsWith: [1, 3, 10, 22, 26], emoji: "🌽" },
  { id: 122, name: "Buckwheat (Cooked)", category: "grains", serving: "1 cup (168g)", servingGrams: 168, calories: 155, protein: 5.7, carbs: 33.5, fat: 1, fiber: 4.5, sugar: 1.5, sodium: 7, tags: ["gluten-free", "whole-grain"], pairsWith: [2, 5, 13, 15, 16], emoji: "🌾" },
  { id: 123, name: "Polenta (Cooked)", category: "grains", serving: "1 cup (240g)", servingGrams: 240, calories: 144, protein: 3.4, carbs: 31, fat: 0.7, fiber: 1.4, sugar: 0, sodium: 5, tags: ["cornmeal"], pairsWith: [1, 3, 9, 11, 22], emoji: "🌽" },
  { id: 124, name: "Barley (Cooked)", category: "grains", serving: "1 cup (157g)", servingGrams: 157, calories: 193, protein: 3.5, carbs: 44.3, fat: 0.7, fiber: 6, sugar: 0.4, sodium: 5, tags: ["whole-grain", "high-fiber"], pairsWith: [1, 3, 9, 12, 27], emoji: "🌾" },
  { id: 125, name: "Sourdough Bread", category: "grains", serving: "2 slices (64g)", servingGrams: 64, calories: 186, protein: 6.4, carbs: 36, fat: 1.3, fiber: 1.6, sugar: 2, sodium: 340, tags: ["fermented"], pairsWith: [7, 8, 18, 21, 24], emoji: "🍞" },

  // ═══════ VEGETABLES (35 items) ═══════
  { id: 131, name: "Broccoli (Steamed)", category: "vegetables", serving: "1 cup (156g)", servingGrams: 156, calories: 55, protein: 3.7, carbs: 11.2, fat: 0.6, fiber: 5.1, sugar: 2.2, sodium: 64, tags: ["cruciferous", "vitamin-c"], pairsWith: [1, 2, 3, 5, 101], emoji: "🥦" },
  { id: 132, name: "Spinach (Cooked)", category: "vegetables", serving: "1 cup (180g)", servingGrams: 180, calories: 41, protein: 5.4, carbs: 6.8, fat: 0.5, fiber: 4.3, sugar: 0.8, sodium: 126, tags: ["iron", "leafy-green"], pairsWith: [1, 2, 4, 7, 103], emoji: "🥬" },
  { id: 133, name: "Asparagus (Grilled)", category: "vegetables", serving: "1 cup (180g)", servingGrams: 180, calories: 36, protein: 4, carbs: 7, fat: 0.4, fiber: 3.6, sugar: 2.2, sodium: 4, tags: ["spring", "vitamin-k"], pairsWith: [2, 5, 9, 12, 101], emoji: "🌿" },
  { id: 134, name: "Mixed Salad Greens", category: "vegetables", serving: "2 cups (100g)", servingGrams: 100, calories: 18, protein: 1.5, carbs: 3, fat: 0.2, fiber: 1.8, sugar: 1, sodium: 30, tags: ["raw", "leafy-green"], pairsWith: [1, 7, 21, 24, 104], emoji: "🥗" },
  { id: 135, name: "Bell Pepper (Red)", category: "vegetables", serving: "1 large (164g)", servingGrams: 164, calories: 43, protein: 1.3, carbs: 9.3, fat: 0.5, fiber: 3.4, sugar: 6.7, sodium: 6, tags: ["vitamin-c", "antioxidant"], pairsWith: [1, 3, 6, 15, 114], emoji: "🫑" },
  { id: 136, name: "Zucchini (Grilled)", category: "vegetables", serving: "1 cup (180g)", servingGrams: 180, calories: 27, protein: 2, carbs: 5, fat: 0.6, fiber: 1.8, sugar: 3.4, sodium: 18, tags: ["low-cal", "summer"], pairsWith: [1, 2, 3, 11, 108], emoji: "🥒" },
  { id: 137, name: "Carrots (Cooked)", category: "vegetables", serving: "1 cup (156g)", servingGrams: 156, calories: 54, protein: 1.2, carbs: 12.8, fat: 0.3, fiber: 4.7, sugar: 6, sodium: 88, tags: ["vitamin-a", "root"], pairsWith: [1, 3, 9, 10, 101], emoji: "🥕" },
  { id: 138, name: "Green Beans (Steamed)", category: "vegetables", serving: "1 cup (125g)", servingGrams: 125, calories: 44, protein: 2.4, carbs: 10, fat: 0.4, fiber: 4, sugar: 2, sodium: 1, tags: ["fiber", "vitamin-c"], pairsWith: [1, 3, 4, 10, 107], emoji: "🫛" },
  { id: 139, name: "Cauliflower (Roasted)", category: "vegetables", serving: "1 cup (124g)", servingGrams: 124, calories: 29, protein: 2.1, carbs: 5.3, fat: 0.3, fiber: 2.1, sugar: 2, sodium: 32, tags: ["cruciferous", "low-carb"], pairsWith: [1, 2, 4, 11, 103], emoji: "🥦" },
  { id: 140, name: "Brussels Sprouts (Roasted)", category: "vegetables", serving: "1 cup (156g)", servingGrams: 156, calories: 56, protein: 4, carbs: 11, fat: 0.5, fiber: 4.1, sugar: 2.7, sodium: 28, tags: ["cruciferous", "vitamin-k"], pairsWith: [1, 4, 9, 10, 101], emoji: "🟢" },
  { id: 141, name: "Kale (Sautéed)", category: "vegetables", serving: "1 cup (130g)", servingGrams: 130, calories: 36, protein: 2.5, carbs: 6, fat: 0.5, fiber: 2.6, sugar: 0, sodium: 30, tags: ["superfood", "leafy-green"], pairsWith: [1, 2, 7, 15, 103], emoji: "🥬" },
  { id: 142, name: "Tomatoes (Fresh)", category: "vegetables", serving: "1 cup (180g)", servingGrams: 180, calories: 32, protein: 1.6, carbs: 7, fat: 0.4, fiber: 2.2, sugar: 4.7, sodium: 9, tags: ["lycopene", "raw"], pairsWith: [7, 15, 18, 104, 116], emoji: "🍅" },
  { id: 143, name: "Cucumber", category: "vegetables", serving: "1 cup (104g)", servingGrams: 104, calories: 16, protein: 0.7, carbs: 3.8, fat: 0.1, fiber: 0.5, sugar: 1.7, sodium: 2, tags: ["hydrating", "raw"], pairsWith: [7, 18, 21, 116, 134], emoji: "🥒" },
  { id: 144, name: "Mushrooms (Sautéed)", category: "vegetables", serving: "1 cup (108g)", servingGrams: 108, calories: 28, protein: 3.6, carbs: 4, fat: 0.3, fiber: 1.5, sugar: 2, sodium: 5, tags: ["umami", "vitamin-d"], pairsWith: [1, 3, 7, 22, 108], emoji: "🍄" },
  { id: 145, name: "Eggplant (Grilled)", category: "vegetables", serving: "1 cup (82g)", servingGrams: 82, calories: 20, protein: 0.8, carbs: 5, fat: 0.2, fiber: 2.5, sugar: 2.9, sodium: 1, tags: ["mediterranean"], pairsWith: [1, 3, 9, 15, 116], emoji: "🍆" },
  { id: 146, name: "Onion (Cooked)", category: "vegetables", serving: "½ cup (105g)", servingGrams: 105, calories: 46, protein: 1.4, carbs: 11, fat: 0.2, fiber: 1.5, sugar: 5.5, sodium: 3, tags: ["aromatic"], pairsWith: [1, 3, 7, 22, 108], emoji: "🧅" },
  { id: 147, name: "Cabbage (Shredded)", category: "vegetables", serving: "1 cup (89g)", servingGrams: 89, calories: 22, protein: 1.1, carbs: 5.2, fat: 0.1, fiber: 2.2, sugar: 2.9, sodium: 16, tags: ["crunchy", "vitamin-c"], pairsWith: [1, 3, 6, 10, 114], emoji: "🥬" },
  { id: 148, name: "Peas (Green, Cooked)", category: "vegetables", serving: "½ cup (80g)", servingGrams: 80, calories: 62, protein: 4.1, carbs: 11.3, fat: 0.2, fiber: 4.4, sugar: 4, sodium: 2, tags: ["protein-veg", "fiber"], pairsWith: [1, 4, 10, 101, 107], emoji: "🟢" },
  { id: 149, name: "Artichoke (Cooked)", category: "vegetables", serving: "1 medium (120g)", servingGrams: 120, calories: 60, protein: 3.5, carbs: 13.4, fat: 0.2, fiber: 6.9, sugar: 1.3, sodium: 72, tags: ["fiber", "prebiotic"], pairsWith: [1, 2, 9, 101, 103], emoji: "🌿" },
  { id: 150, name: "Celery", category: "vegetables", serving: "4 stalks (160g)", servingGrams: 160, calories: 26, protein: 1.1, carbs: 4.8, fat: 0.3, fiber: 2.6, sugar: 2, sodium: 128, tags: ["low-cal", "hydrating"], pairsWith: [18, 21, 134, 161, 171], emoji: "🌿" },

  // ═══════ FRUITS (30 items) ═══════
  { id: 151, name: "Banana", category: "fruits", serving: "1 medium (118g)", servingGrams: 118, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14.4, sodium: 1, tags: ["potassium", "energy"], pairsWith: [19, 20, 105, 118, 171], emoji: "🍌" },
  { id: 152, name: "Blueberries", category: "fruits", serving: "1 cup (148g)", servingGrams: 148, calories: 84, protein: 1.1, carbs: 21.5, fat: 0.5, fiber: 3.6, sugar: 15, sodium: 1, tags: ["antioxidant", "berry"], pairsWith: [19, 105, 118, 120, 171], emoji: "🫐" },
  { id: 153, name: "Apple", category: "fruits", serving: "1 medium (182g)", servingGrams: 182, calories: 95, protein: 0.5, carbs: 25.1, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2, tags: ["fiber", "portable"], pairsWith: [18, 19, 20, 105, 171], emoji: "🍎" },
  { id: 154, name: "Strawberries", category: "fruits", serving: "1 cup (152g)", servingGrams: 152, calories: 49, protein: 1, carbs: 11.7, fat: 0.5, fiber: 3, sugar: 7, sodium: 2, tags: ["vitamin-c", "berry"], pairsWith: [19, 105, 118, 120, 171], emoji: "🍓" },
  { id: 155, name: "Orange", category: "fruits", serving: "1 large (184g)", servingGrams: 184, calories: 86, protein: 1.7, carbs: 22, fat: 0.2, fiber: 4.4, sugar: 17, sodium: 0, tags: ["vitamin-c", "citrus"], pairsWith: [18, 19, 20, 105, 134], emoji: "🍊" },
  { id: 156, name: "Avocado", category: "fruits", serving: "½ medium (68g)", servingGrams: 68, calories: 114, protein: 1.3, carbs: 6, fat: 10.5, fiber: 4.6, sugar: 0.5, sodium: 5, tags: ["healthy-fat", "fiber"], pairsWith: [7, 8, 104, 114, 134], emoji: "🥑" },
  { id: 157, name: "Mango", category: "fruits", serving: "1 cup (165g)", servingGrams: 165, calories: 99, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, sugar: 23, sodium: 2, tags: ["tropical", "vitamin-a"], pairsWith: [19, 20, 105, 118, 171], emoji: "🥭" },
  { id: 158, name: "Pineapple (Fresh)", category: "fruits", serving: "1 cup (165g)", servingGrams: 165, calories: 82, protein: 0.9, carbs: 22, fat: 0.2, fiber: 2.3, sugar: 16, sodium: 2, tags: ["tropical", "bromelain"], pairsWith: [1, 19, 105, 118, 171], emoji: "🍍" },
  { id: 159, name: "Watermelon", category: "fruits", serving: "1 cup (152g)", servingGrams: 152, calories: 46, protein: 0.9, carbs: 11.5, fat: 0.2, fiber: 0.6, sugar: 9.4, sodium: 2, tags: ["hydrating", "summer"], pairsWith: [18, 19, 134, 143], emoji: "🍉" },
  { id: 160, name: "Grapes (Red)", category: "fruits", serving: "1 cup (151g)", servingGrams: 151, calories: 104, protein: 1.1, carbs: 27, fat: 0.2, fiber: 1.4, sugar: 23, sodium: 3, tags: ["antioxidant"], pairsWith: [18, 19, 171, 172], emoji: "🍇" },
  { id: 161, name: "Peach", category: "fruits", serving: "1 medium (150g)", servingGrams: 150, calories: 59, protein: 1.4, carbs: 14.3, fat: 0.4, fiber: 2.3, sugar: 12.6, sodium: 0, tags: ["summer", "vitamin-c"], pairsWith: [18, 19, 105, 118, 134], emoji: "🍑" },
  { id: 162, name: "Pomegranate Seeds", category: "fruits", serving: "½ cup (87g)", servingGrams: 87, calories: 72, protein: 1.5, carbs: 16.3, fat: 1, fiber: 3.5, sugar: 12, sodium: 3, tags: ["antioxidant", "superfood"], pairsWith: [19, 103, 116, 134], emoji: "🫐" },
  { id: 163, name: "Kiwi", category: "fruits", serving: "2 medium (138g)", servingGrams: 138, calories: 84, protein: 1.6, carbs: 20.3, fat: 0.7, fiber: 4.1, sugar: 12.3, sodium: 4, tags: ["vitamin-c", "fiber"], pairsWith: [19, 105, 118, 120, 171], emoji: "🥝" },
  { id: 164, name: "Lime / Lemon", category: "fruits", serving: "juice of 1 (45g)", servingGrams: 45, calories: 11, protein: 0.2, carbs: 3.7, fat: 0, fiber: 0.1, sugar: 1.1, sodium: 1, tags: ["citrus", "vitamin-c"], pairsWith: [2, 5, 6, 114, 134], emoji: "🍋" },
  { id: 165, name: "Dates (Medjool)", category: "fruits", serving: "3 dates (72g)", servingGrams: 72, calories: 200, protein: 1.4, carbs: 54, fat: 0.1, fiber: 4.8, sugar: 48, sodium: 0, tags: ["energy", "natural-sugar"], pairsWith: [20, 171, 172, 173], emoji: "🌴" },
  { id: 166, name: "Raspberries", category: "fruits", serving: "1 cup (123g)", servingGrams: 123, calories: 64, protein: 1.5, carbs: 14.7, fat: 0.8, fiber: 8, sugar: 5.4, sodium: 1, tags: ["fiber", "berry"], pairsWith: [19, 105, 118, 120, 171], emoji: "🔴" },
  { id: 167, name: "Grapefruit", category: "fruits", serving: "½ medium (128g)", servingGrams: 128, calories: 52, protein: 0.9, carbs: 13, fat: 0.2, fiber: 2, sugar: 8.5, sodium: 0, tags: ["citrus", "vitamin-c"], pairsWith: [18, 19, 105, 134], emoji: "🍊" },
  { id: 168, name: "Pear", category: "fruits", serving: "1 medium (178g)", servingGrams: 178, calories: 101, protein: 0.6, carbs: 27, fat: 0.2, fiber: 5.5, sugar: 17, sodium: 2, tags: ["fiber"], pairsWith: [18, 19, 105, 171, 172], emoji: "🍐" },
  { id: 169, name: "Papaya", category: "fruits", serving: "1 cup (145g)", servingGrams: 145, calories: 62, protein: 0.7, carbs: 16, fat: 0.4, fiber: 2.5, sugar: 11, sodium: 12, tags: ["tropical", "enzyme"], pairsWith: [19, 105, 118, 134], emoji: "🏝️" },
  { id: 170, name: "Cherries", category: "fruits", serving: "1 cup (138g)", servingGrams: 138, calories: 87, protein: 1.5, carbs: 22, fat: 0.3, fiber: 2.9, sugar: 17.7, sodium: 0, tags: ["antioxidant", "anti-inflammatory"], pairsWith: [19, 105, 118, 120, 171], emoji: "🍒" },

  // ═══════ DAIRY (15 items) ═══════
  { id: 171, name: "Whole Milk", category: "dairy", serving: "1 cup (244g)", servingGrams: 244, calories: 149, protein: 8, carbs: 12, fat: 8, fiber: 0, sugar: 12, sodium: 105, tags: ["calcium"], pairsWith: [105, 118, 120, 151, 153], emoji: "🥛" },
  { id: 172, name: "Skim Milk", category: "dairy", serving: "1 cup (245g)", servingGrams: 245, calories: 83, protein: 8.3, carbs: 12.2, fat: 0.2, fiber: 0, sugar: 12.5, sodium: 103, tags: ["low-fat", "calcium"], pairsWith: [105, 118, 120, 151, 153], emoji: "🥛" },
  { id: 173, name: "Cheddar Cheese", category: "dairy", serving: "30g", servingGrams: 30, calories: 120, protein: 7, carbs: 0.4, fat: 10, fiber: 0, sugar: 0.1, sodium: 176, tags: ["aged", "calcium"], pairsWith: [7, 104, 107, 153, 160], emoji: "🧀" },
  { id: 174, name: "Mozzarella Cheese", category: "dairy", serving: "30g", servingGrams: 30, calories: 85, protein: 6.3, carbs: 0.7, fat: 6.3, fiber: 0, sugar: 0.3, sodium: 138, tags: ["fresh", "italian"], pairsWith: [108, 109, 134, 142, 145], emoji: "🧀" },
  { id: 175, name: "Feta Cheese", category: "dairy", serving: "30g", servingGrams: 30, calories: 75, protein: 4, carbs: 1.2, fat: 6, fiber: 0, sugar: 1.2, sodium: 316, tags: ["mediterranean", "tangy"], pairsWith: [103, 116, 134, 142, 143], emoji: "🧀" },
  { id: 176, name: "Parmesan Cheese (Grated)", category: "dairy", serving: "2 tbsp (14g)", servingGrams: 14, calories: 55, protein: 5, carbs: 0.5, fat: 3.7, fiber: 0, sugar: 0.1, sodium: 230, tags: ["italian", "umami"], pairsWith: [108, 109, 131, 134, 144], emoji: "🧀" },
  { id: 177, name: "Plain Yogurt (Full-fat)", category: "dairy", serving: "1 cup (245g)", servingGrams: 245, calories: 149, protein: 8.5, carbs: 11.4, fat: 8, fiber: 0, sugar: 11.4, sodium: 113, tags: ["probiotic"], pairsWith: [105, 118, 151, 153, 165], emoji: "🥛" },
  { id: 178, name: "Butter", category: "dairy", serving: "1 tbsp (14g)", servingGrams: 14, calories: 102, protein: 0.1, carbs: 0, fat: 11.5, fiber: 0, sugar: 0, sodium: 82, tags: ["fat", "cooking"], pairsWith: [104, 107, 121, 125, 131], emoji: "🧈" },
  { id: 179, name: "Cream Cheese", category: "dairy", serving: "2 tbsp (28g)", servingGrams: 28, calories: 98, protein: 1.7, carbs: 1.6, fat: 9.8, fiber: 0, sugar: 0.8, sodium: 84, tags: ["spread"], pairsWith: [104, 116, 125, 153, 154], emoji: "🧀" },
  { id: 180, name: "Ricotta Cheese (Part-skim)", category: "dairy", serving: "½ cup (124g)", servingGrams: 124, calories: 171, protein: 14.1, carbs: 6.4, fat: 10, fiber: 0, sugar: 0.4, sodium: 155, tags: ["italian", "protein"], pairsWith: [108, 109, 131, 132, 142], emoji: "🧀" },

  // ═══════ LEGUMES (20 items) ═══════
  { id: 181, name: "Chickpeas (Cooked)", category: "legumes", serving: "1 cup (164g)", servingGrams: 164, calories: 269, protein: 14.5, carbs: 45, fat: 4.2, fiber: 12.5, sugar: 8, sodium: 11, tags: ["hummus", "fiber"], pairsWith: [101, 103, 116, 131, 134], emoji: "🫘" },
  { id: 182, name: "Black Beans (Cooked)", category: "legumes", serving: "1 cup (172g)", servingGrams: 172, calories: 227, protein: 15.2, carbs: 41, fat: 0.9, fiber: 15, sugar: 0.6, sodium: 2, tags: ["fiber", "iron"], pairsWith: [101, 102, 114, 131, 135], emoji: "🫘" },
  { id: 183, name: "Lentils (Cooked)", category: "legumes", serving: "1 cup (198g)", servingGrams: 198, calories: 230, protein: 17.9, carbs: 40, fat: 0.8, fiber: 15.6, sugar: 3.6, sodium: 4, tags: ["iron", "folate"], pairsWith: [101, 103, 117, 131, 132], emoji: "🫘" },
  { id: 184, name: "Kidney Beans (Cooked)", category: "legumes", serving: "1 cup (177g)", servingGrams: 177, calories: 225, protein: 15.3, carbs: 40.4, fat: 0.9, fiber: 11.3, sugar: 0.6, sodium: 2, tags: ["fiber", "mineral"], pairsWith: [101, 102, 114, 131, 137], emoji: "🫘" },
  { id: 185, name: "Edamame", category: "legumes", serving: "1 cup (155g)", servingGrams: 155, calories: 188, protein: 18.4, carbs: 13.8, fat: 8, fiber: 8, sugar: 3.4, sodium: 9, tags: ["soy", "snack"], pairsWith: [101, 102, 110, 131, 143], emoji: "🫛" },
  { id: 186, name: "Hummus", category: "legumes", serving: "¼ cup (62g)", servingGrams: 62, calories: 108, protein: 3, carbs: 9, fat: 7.4, fiber: 2, sugar: 0, sodium: 150, tags: ["dip", "mediterranean"], pairsWith: [116, 131, 134, 135, 143], emoji: "🫘" },
  { id: 187, name: "Peanut Butter", category: "legumes", serving: "2 tbsp (32g)", servingGrams: 32, calories: 190, protein: 7, carbs: 7, fat: 16, fiber: 2, sugar: 3, sodium: 136, tags: ["spread", "calorie-dense"], pairsWith: [104, 105, 119, 151, 153], emoji: "🥜" },
  { id: 188, name: "Almonds", category: "legumes", serving: "¼ cup (35g)", servingGrams: 35, calories: 207, protein: 7.6, carbs: 7.7, fat: 17.8, fiber: 4.4, sugar: 1.5, sodium: 0, tags: ["nut", "vitamin-e"], pairsWith: [19, 105, 118, 153, 165], emoji: "🥜" },
  { id: 189, name: "Walnuts", category: "legumes", serving: "¼ cup (30g)", servingGrams: 30, calories: 196, protein: 4.6, carbs: 4.1, fat: 19.6, fiber: 2, sugar: 0.8, sodium: 1, tags: ["omega-3", "nut"], pairsWith: [19, 105, 118, 134, 153], emoji: "🥜" },
  { id: 190, name: "Cashews", category: "legumes", serving: "¼ cup (32g)", servingGrams: 32, calories: 180, protein: 5.2, carbs: 9.3, fat: 14.3, fiber: 1, sugar: 1.9, sodium: 4, tags: ["nut", "magnesium"], pairsWith: [19, 101, 102, 110, 151], emoji: "🥜" },
  { id: 191, name: "Lima Beans (Cooked)", category: "legumes", serving: "1 cup (170g)", servingGrams: 170, calories: 209, protein: 11.6, carbs: 40, fat: 0.5, fiber: 9, sugar: 2.8, sodium: 5, tags: ["fiber", "starchy"], pairsWith: [1, 101, 121, 131, 137], emoji: "🫘" },
  { id: 192, name: "Split Peas (Cooked)", category: "legumes", serving: "1 cup (196g)", servingGrams: 196, calories: 231, protein: 16.3, carbs: 41, fat: 0.8, fiber: 16.3, sugar: 5.7, sodium: 4, tags: ["soup", "fiber"], pairsWith: [101, 104, 117, 131, 137], emoji: "🟢" },
  { id: 193, name: "Flaxseeds", category: "legumes", serving: "2 tbsp (14g)", servingGrams: 14, calories: 75, protein: 2.6, carbs: 4, fat: 6, fiber: 3.8, sugar: 0.2, sodium: 4, tags: ["omega-3", "seed"], pairsWith: [19, 105, 118, 151, 154], emoji: "🌰" },
  { id: 194, name: "Chia Seeds", category: "legumes", serving: "2 tbsp (24g)", servingGrams: 24, calories: 117, protein: 4, carbs: 10, fat: 7.4, fiber: 8.3, sugar: 0, sodium: 4, tags: ["omega-3", "seed", "fiber"], pairsWith: [19, 105, 118, 151, 157], emoji: "🌰" },
  { id: 195, name: "Sunflower Seeds", category: "legumes", serving: "¼ cup (33g)", servingGrams: 33, calories: 190, protein: 6.5, carbs: 6.5, fat: 16.5, fiber: 3, sugar: 0.8, sodium: 1, tags: ["seed", "vitamin-e"], pairsWith: [19, 105, 118, 134, 153], emoji: "🌻" },
  { id: 196, name: "Pistachios", category: "legumes", serving: "¼ cup (31g)", servingGrams: 31, calories: 174, protein: 6.3, carbs: 8.7, fat: 13.9, fiber: 3.2, sugar: 2.4, sodium: 0, tags: ["nut", "potassium"], pairsWith: [19, 105, 118, 153, 165], emoji: "🥜" },
  { id: 197, name: "Pine Nuts", category: "legumes", serving: "2 tbsp (18g)", servingGrams: 18, calories: 121, protein: 2.5, carbs: 2.3, fat: 12.3, fiber: 0.7, sugar: 0.6, sodium: 0, tags: ["nut", "pesto"], pairsWith: [108, 131, 132, 134, 142], emoji: "🥜" },
  { id: 198, name: "White Beans (Cooked)", category: "legumes", serving: "1 cup (179g)", servingGrams: 179, calories: 249, protein: 17.4, carbs: 45, fat: 0.6, fiber: 11.3, sugar: 0.6, sodium: 11, tags: ["fiber", "iron"], pairsWith: [1, 101, 104, 131, 132], emoji: "🫘" },
  { id: 199, name: "Mung Beans (Cooked)", category: "legumes", serving: "1 cup (202g)", servingGrams: 202, calories: 212, protein: 14.2, carbs: 38.7, fat: 0.8, fiber: 15.4, sugar: 4, sodium: 4, tags: ["sproutable"], pairsWith: [101, 102, 110, 131, 132], emoji: "🫘" },
  { id: 200, name: "Almond Butter", category: "legumes", serving: "2 tbsp (32g)", servingGrams: 32, calories: 196, protein: 6.8, carbs: 6, fat: 17.8, fiber: 3.4, sugar: 2.1, sodium: 2, tags: ["spread", "vitamin-e"], pairsWith: [104, 105, 119, 151, 153], emoji: "🥜" },

  // ═══════ SNACKS & EXTRAS (15 items) ═══════
  { id: 201, name: "Dark Chocolate (85%)", category: "snacks", serving: "30g", servingGrams: 30, calories: 170, protein: 2.2, carbs: 13, fat: 13, fiber: 3.1, sugar: 5, sodium: 6, tags: ["antioxidant", "treat"], pairsWith: [151, 153, 165, 188, 196], emoji: "🍫" },
  { id: 202, name: "Protein Bar", category: "snacks", serving: "1 bar (60g)", servingGrams: 60, calories: 210, protein: 20, carbs: 22, fat: 7, fiber: 5, sugar: 4, sodium: 180, tags: ["convenient", "supplement"], pairsWith: [151, 153, 155, 171, 172], emoji: "🍫" },
  { id: 203, name: "Trail Mix", category: "snacks", serving: "¼ cup (40g)", servingGrams: 40, calories: 200, protein: 6, carbs: 18, fat: 13, fiber: 2, sugar: 10, sodium: 60, tags: ["portable", "energy"], pairsWith: [153, 155, 171], emoji: "🥜" },
  { id: 204, name: "Popcorn (Air-popped)", category: "snacks", serving: "3 cups (24g)", servingGrams: 24, calories: 93, protein: 3, carbs: 18.6, fat: 1.1, fiber: 3.6, sugar: 0.2, sodium: 2, tags: ["whole-grain", "low-cal"], pairsWith: [], emoji: "🍿" },
  { id: 205, name: "Dried Apricots", category: "snacks", serving: "¼ cup (33g)", servingGrams: 33, calories: 80, protein: 1.1, carbs: 21, fat: 0.1, fiber: 2.4, sugar: 17, sodium: 4, tags: ["iron", "portable"], pairsWith: [188, 190, 196], emoji: "🍑" },
  { id: 206, name: "Energy Balls (Homemade)", category: "snacks", serving: "2 balls (50g)", servingGrams: 50, calories: 180, protein: 5, carbs: 20, fat: 10, fiber: 3, sugar: 12, sodium: 30, tags: ["pre-workout"], pairsWith: [151, 165, 187, 194], emoji: "⚡" },
  { id: 207, name: "Beef Jerky", category: "snacks", serving: "1 oz (28g)", servingGrams: 28, calories: 116, protein: 9.4, carbs: 3.1, fat: 7.3, fiber: 0.4, sugar: 2.6, sodium: 506, tags: ["high-protein", "portable"], pairsWith: [119, 153, 155], emoji: "🥩" },
  { id: 208, name: "Crackers (Whole Wheat)", category: "snacks", serving: "8 crackers (30g)", servingGrams: 30, calories: 130, protein: 3, carbs: 20, fat: 4.5, fiber: 3, sugar: 0, sodium: 200, tags: ["whole-grain"], pairsWith: [18, 173, 175, 186], emoji: "🍘" },
  { id: 209, name: "Dried Mango", category: "snacks", serving: "¼ cup (40g)", servingGrams: 40, calories: 128, protein: 0.8, carbs: 32, fat: 0, fiber: 1.3, sugar: 28, sodium: 10, tags: ["tropical", "sweet"], pairsWith: [188, 190, 196], emoji: "🥭" },
  { id: 210, name: "Olives (Mixed)", category: "snacks", serving: "10 olives (40g)", servingGrams: 40, calories: 46, protein: 0.4, carbs: 2.5, fat: 4, fiber: 1.2, sugar: 0, sodium: 420, tags: ["healthy-fat", "mediterranean"], pairsWith: [104, 116, 134, 142, 175], emoji: "🫒" },

  // ═══════ COMPLETE MEALS (15 items) ═══════
  { id: 211, name: "Chicken Rice Bowl", category: "meals", serving: "1 bowl", servingGrams: 400, calories: 520, protein: 42, carbs: 58, fat: 12, fiber: 4, sugar: 3, sodium: 480, tags: ["balanced", "meal-prep"], pairsWith: [131, 132, 134, 137], emoji: "🍱" },
  { id: 212, name: "Salmon Quinoa Salad", category: "meals", serving: "1 bowl", servingGrams: 380, calories: 490, protein: 36, carbs: 42, fat: 18, fiber: 7, sugar: 4, sodium: 320, tags: ["omega-3", "superfood"], pairsWith: [131, 133, 134, 156], emoji: "🥗" },
  { id: 213, name: "Beef Stir-Fry w/ Rice", category: "meals", serving: "1 plate", servingGrams: 450, calories: 580, protein: 38, carbs: 62, fat: 16, fiber: 5, sugar: 8, sodium: 620, tags: ["asian", "quick"], pairsWith: [131, 135, 136, 144], emoji: "🍛" },
  { id: 214, name: "Turkey Wrap", category: "meals", serving: "1 wrap", servingGrams: 280, calories: 380, protein: 32, carbs: 38, fat: 11, fiber: 4, sugar: 3, sodium: 580, tags: ["portable", "lunch"], pairsWith: [134, 135, 142, 143], emoji: "🌯" },
  { id: 215, name: "Pasta Bolognese", category: "meals", serving: "1 plate", servingGrams: 420, calories: 540, protein: 28, carbs: 64, fat: 18, fiber: 5, sugar: 10, sodium: 520, tags: ["italian", "comfort"], pairsWith: [131, 134, 142, 176], emoji: "🍝" },
  { id: 216, name: "Grilled Fish Tacos", category: "meals", serving: "3 tacos", servingGrams: 340, calories: 420, protein: 32, carbs: 40, fat: 14, fiber: 6, sugar: 4, sodium: 460, tags: ["mexican", "fish"], pairsWith: [134, 135, 143, 156, 164], emoji: "🌮" },
  { id: 217, name: "Lentil Soup", category: "meals", serving: "1.5 cups", servingGrams: 360, calories: 280, protein: 18, carbs: 46, fat: 4, fiber: 16, sugar: 6, sodium: 480, tags: ["vegan", "comfort", "fiber"], pairsWith: [104, 125, 131, 137, 142], emoji: "🥣" },
  { id: 218, name: "Chicken Caesar Salad", category: "meals", serving: "1 large", servingGrams: 350, calories: 440, protein: 38, carbs: 16, fat: 26, fiber: 4, sugar: 3, sodium: 680, tags: ["classic", "high-protein"], pairsWith: [104, 125, 142, 176], emoji: "🥗" },
  { id: 219, name: "Tuna Poke Bowl", category: "meals", serving: "1 bowl", servingGrams: 380, calories: 460, protein: 34, carbs: 52, fat: 12, fiber: 5, sugar: 8, sodium: 520, tags: ["hawaiian", "fresh"], pairsWith: [131, 134, 143, 156, 185], emoji: "🍱" },
  { id: 220, name: "Egg & Veggie Omelette", category: "meals", serving: "3-egg omelette", servingGrams: 260, calories: 320, protein: 24, carbs: 8, fat: 22, fiber: 3, sugar: 3, sodium: 420, tags: ["breakfast", "keto"], pairsWith: [104, 125, 131, 135, 144], emoji: "🍳" },
  { id: 221, name: "Shrimp Fried Rice", category: "meals", serving: "1 plate", servingGrams: 400, calories: 480, protein: 28, carbs: 56, fat: 16, fiber: 3, sugar: 4, sodium: 680, tags: ["asian", "quick"], pairsWith: [131, 135, 137, 148], emoji: "🍛" },
  { id: 222, name: "Greek Salad w/ Chicken", category: "meals", serving: "1 large", servingGrams: 380, calories: 420, protein: 36, carbs: 18, fat: 24, fiber: 5, sugar: 6, sodium: 560, tags: ["mediterranean", "fresh"], pairsWith: [116, 131, 142, 143, 175], emoji: "🥗" },
  { id: 223, name: "Overnight Oats", category: "meals", serving: "1 jar", servingGrams: 300, calories: 380, protein: 16, carbs: 52, fat: 12, fiber: 8, sugar: 18, sodium: 80, tags: ["breakfast", "meal-prep"], pairsWith: [151, 152, 154, 194], emoji: "🥣" },
  { id: 224, name: "Burrito Bowl", category: "meals", serving: "1 bowl", servingGrams: 420, calories: 560, protein: 34, carbs: 62, fat: 18, fiber: 12, sugar: 4, sodium: 620, tags: ["mexican", "balanced"], pairsWith: [131, 134, 135, 156, 164], emoji: "🍱" },
  { id: 225, name: "Smoothie Bowl", category: "meals", serving: "1 bowl", servingGrams: 350, calories: 340, protein: 18, carbs: 52, fat: 8, fiber: 8, sugar: 30, sodium: 80, tags: ["breakfast", "fresh"], pairsWith: [118, 151, 152, 154, 194], emoji: "🥣" },
];

/* ═══════════════════════════════════════════════════════════════
   CATEGORY META
   ═══════════════════════════════════════════════════════════════ */
const CATEGORIES: { key: MealCategory; label: string; icon: any; color: string }[] = [
  { key: "meals",      label: "Meals",      icon: Utensils,  color: "var(--accent)" },
  { key: "protein",    label: "Protein",    icon: Drumstick, color: "#f44" },
  { key: "grains",     label: "Grains",     icon: Wheat,     color: "#f0a020" },
  { key: "vegetables", label: "Veggies",    icon: Leaf,      color: "#4ade80" },
  { key: "fruits",     label: "Fruits",     icon: Apple,     color: "#f472b6" },
  { key: "dairy",      label: "Dairy",      icon: Egg,       color: "#fbbf24" },
  { key: "legumes",    label: "Legumes",    icon: Fish,      color: "#a78bfa" },
  { key: "snacks",     label: "Snacks",     icon: Search,    color: "#fb923c" },
];

/* ═══════════════════════════════════════════════════════════════
   MACRO CALCULATOR COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export function MacroCalculator() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<MealCategory | "all">("all");
  const [selected, setSelected] = useState<MealItem | null>(null);
  const [servings, setServings] = useState(1);
  const [plate, setPlate] = useState<{ item: MealItem; servings: number }[]>([]);
  const [showList, setShowList] = useState(true);

  /* Filtering */
  const filtered = useMemo(() => {
    let items = DB;
    if (activeCategory !== "all") items = items.filter(m => m.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.tags.some(t => t.includes(q)) ||
        m.category.includes(q)
      );
    }
    return items;
  }, [search, activeCategory]);

  /* Pairings for selected item */
  const pairings = useMemo(() => {
    if (!selected) return [];
    return selected.pairsWith
      .map(id => DB.find(m => m.id === id))
      .filter(Boolean) as MealItem[];
  }, [selected]);

  /* Macro totals for plate */
  const plateTotals = useMemo(() => {
    const t = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
    plate.forEach(({ item, servings: s }) => {
      t.calories += item.calories * s;
      t.protein += item.protein * s;
      t.carbs += item.carbs * s;
      t.fat += item.fat * s;
      t.fiber += item.fiber * s;
      t.sugar += item.sugar * s;
      t.sodium += item.sodium * s;
    });
    return t;
  }, [plate]);

  /* Helpers */
  const selectItem = (item: MealItem) => {
    setSelected(item);
    setServings(1);
    setShowList(false);
  };

  const addToPlate = (item: MealItem, s: number) => {
    setPlate(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) return prev.map(p => p.item.id === item.id ? { ...p, servings: p.servings + s } : p);
      return [...prev, { item, servings: s }];
    });
  };

  const removeFromPlate = (id: number) => setPlate(prev => prev.filter(p => p.item.id !== id));

  /* macro percentage for pie */
  const macroTotal = (item: MealItem, s: number) => {
    const p = item.protein * s * 4;
    const c = item.carbs * s * 4;
    const f = item.fat * s * 9;
    const total = p + c + f || 1;
    return { proteinPct: Math.round(p / total * 100), carbsPct: Math.round(c / total * 100), fatPct: Math.round(f / total * 100) };
  };

  /* Styles */
  const card: CSSProperties = { backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" };
  const pill = (active: boolean, color = "var(--accent)"): CSSProperties => ({
    padding: "6px 13px", borderRadius: 20, fontSize: 11, fontWeight: 600, border: "none",
    cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
    backgroundColor: active ? `${color}` : "var(--bg-surface)",
    color: active ? (color === "var(--accent)" ? "#0A0A0B" : "#fff") : "var(--text-secondary)",
  });

  /* ─────── RENDER ─────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Search Bar */}
      <div style={{ position: "relative" }}>
        <Search size={15} style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setShowList(true); setSelected(null); }}
          placeholder="Search 200+ foods… (chicken, quinoa, banana…)"
          style={{
            width: "100%", padding: "11px 14px 11px 36px", borderRadius: 12,
            backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)",
            fontSize: 13, color: "var(--text-primary)", outline: "none",
            fontFamily: "'Outfit', sans-serif",
          }}
        />
        {search && (
          <button onClick={() => { setSearch(""); setShowList(true); }} style={{ position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 2 }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={() => { setActiveCategory("all"); setShowList(true); setSelected(null); }} style={pill(activeCategory === "all")}>All</button>
        {CATEGORIES.map(c => (
          <button key={c.key} onClick={() => { setActiveCategory(c.key); setShowList(true); setSelected(null); }} style={pill(activeCategory === c.key, c.color)}>
            <c.icon size={11} style={{ marginInlineEnd: 4, verticalAlign: "middle" }} />
            {c.label}
          </button>
        ))}
      </div>

      {/* ══════ FOOD LIST ══════ */}
      {showList && !selected && (
        <div style={{ ...card, maxHeight: 380, overflowY: "auto" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No foods found. Try a different search.
            </div>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                onClick={() => selectItem(item)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  width: "100%", textAlign: "start", background: "none", border: "none",
                  borderBottom: "1px solid var(--border)", cursor: "pointer",
                  transition: "background-color 0.15s", color: "var(--text-primary)", fontSize: 13,
                }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = "var(--bg-surface)")}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <span style={{ fontSize: 20, width: 28, textAlign: "center", flexShrink: 0 }}>{item.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.serving} · {item.calories} kcal</p>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 10, color: "var(--text-muted)", flexShrink: 0, fontFamily: "'Chakra Petch', sans-serif" }}>
                  <span style={{ color: "#3b8bff" }}>P {item.protein}g</span>
                  <span style={{ color: "#f0a020" }}>C {item.carbs}g</span>
                  <span style={{ color: "#f44" }}>F {item.fat}g</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ══════ SELECTED ITEM DETAIL ══════ */}
      {selected && !showList && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Header */}
          <div style={{ ...card, padding: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <button onClick={() => { setSelected(null); setShowList(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0 }}>
                <ChevronDown size={18} style={{ transform: "rotate(90deg)" }} />
              </button>
              <span style={{ fontSize: 28 }}>{selected.emoji}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700 }}>{selected.name}</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{selected.serving}</p>
              </div>
            </div>

            {/* Serving adjuster */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, backgroundColor: "var(--bg-surface)", padding: "8px 14px", borderRadius: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Servings:</span>
              <button onClick={() => setServings(Math.max(0.5, servings - 0.5))} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }}>
                <Minus size={13} />
              </button>
              <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 16, fontWeight: 700, minWidth: 30, textAlign: "center" }}>{servings}</span>
              <button onClick={() => setServings(servings + 0.5)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" }}>
                <Plus size={13} />
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => addToPlate(selected, servings)}
                style={{
                  padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer",
                  backgroundColor: "var(--accent)", color: "#0A0A0B",
                  fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, fontSize: 12,
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <Plus size={12} /> Add to Plate
              </button>
            </div>

            {/* Calorie hero */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Total Calories</p>
              <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 42, fontWeight: 800, color: "var(--accent)", lineHeight: 1 }}>
                {Math.round(selected.calories * servings)}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>kcal</p>
            </div>

            {/* Macro bars */}
            {(() => {
              const m = macroTotal(selected, servings);
              const macros = [
                { label: "Protein", value: Math.round(selected.protein * servings * 10) / 10, unit: "g", pct: m.proteinPct, color: "#3b8bff" },
                { label: "Carbs", value: Math.round(selected.carbs * servings * 10) / 10, unit: "g", pct: m.carbsPct, color: "#f0a020" },
                { label: "Fat", value: Math.round(selected.fat * servings * 10) / 10, unit: "g", pct: m.fatPct, color: "#f44" },
              ];
              return (
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  {macros.map(mc => (
                    <div key={mc.label} style={{ flex: 1, backgroundColor: "var(--bg-surface)", borderRadius: 12, padding: "12px", textAlign: "center" }}>
                      <p style={{ fontSize: 10, fontWeight: 600, color: mc.color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{mc.label}</p>
                      <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{mc.value}<span style={{ fontSize: 11, fontWeight: 400 }}>{mc.unit}</span></p>
                      <div style={{ height: 4, borderRadius: 2, backgroundColor: "var(--border)", marginTop: 8, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${mc.pct}%`, backgroundColor: mc.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                      </div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{mc.pct}%</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Additional nutrients */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
                { l: "Fiber", v: Math.round(selected.fiber * servings * 10) / 10, u: "g" },
                { l: "Sugar", v: Math.round(selected.sugar * servings * 10) / 10, u: "g" },
                { l: "Sodium", v: Math.round(selected.sodium * servings), u: "mg" },
              ].map(n => (
                <div key={n.l} style={{ padding: "8px 10px", borderRadius: 10, backgroundColor: "var(--bg-surface)", textAlign: "center" }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{n.l}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Chakra Petch', sans-serif" }}>{n.v}<span style={{ fontSize: 10, fontWeight: 400 }}>{n.u}</span></p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recommended Pairings ── */}
          {pairings.length > 0 && (
            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Utensils size={14} color="var(--accent)" />
                <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700 }}>
                  {selected.category === "vegetables" || selected.category === "fruits"
                    ? "Best Paired With Meals"
                    : "Recommended Side Dishes"}
                </h4>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pairings.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectItem(p)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                      borderRadius: 10, background: "var(--bg-surface)",
                      cursor: "pointer", textAlign: "start", width: "100%",
                      transition: "box-shadow 0.15s", color: "var(--text-primary)", fontSize: 12,
                    }}
                    onMouseOver={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(200,255,0,0.10)")}
                    onMouseOut={e => (e.currentTarget.style.boxShadow = "none")}
                  >
                    <span style={{ fontSize: 18 }}>{p.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{p.serving} · {p.calories} kcal</p>
                    </div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10, fontFamily: "'Chakra Petch', sans-serif", flexShrink: 0 }}>
                      <span style={{ color: "#3b8bff" }}>P{p.protein}</span>
                      <span style={{ color: "#f0a020" }}>C{p.carbs}</span>
                      <span style={{ color: "#f44" }}>F{p.fat}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); addToPlate(p, 1); }}
                      style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid var(--border)", background: "var(--bg-card)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", flexShrink: 0 }}
                      title="Add to plate"
                    >
                      <Plus size={12} />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════ MY PLATE (running total) ══════ */}
      {plate.length > 0 && (
        <div style={{ ...card, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <PieChart size={14} color="var(--accent)" />
            <h4 style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 13, fontWeight: 700, flex: 1 }}>
              My Plate
            </h4>
            <button onClick={() => setPlate([])} style={{ fontSize: 11, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
              Clear All
            </button>
          </div>

          {plate.map(({ item, servings: s }) => (
            <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 16 }}>{item.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)" }}>{s}× {item.serving}</p>
              </div>
              <span style={{ fontSize: 12, fontFamily: "'Chakra Petch', sans-serif", fontWeight: 700, color: "var(--accent)" }}>
                {Math.round(item.calories * s)} kcal
              </span>
              <button onClick={() => removeFromPlate(item.id)} style={{ width: 24, height: 24, borderRadius: 6, border: "1px solid var(--border)", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <X size={11} />
              </button>
            </div>
          ))}

          {/* Plate totals */}
          <div style={{ marginTop: 14, padding: "14px", borderRadius: 12, background: "linear-gradient(135deg, rgba(200,255,0,0.06), rgba(59,139,255,0.06))", border: "1px solid rgba(200,255,0,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <span style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>
                {Math.round(plateTotals.calories)}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginInlineStart: 4 }}>kcal total</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
              {[
                { l: "Protein", v: Math.round(plateTotals.protein), c: "#3b8bff" },
                { l: "Carbs", v: Math.round(plateTotals.carbs), c: "#f0a020" },
                { l: "Fat", v: Math.round(plateTotals.fat), c: "#f44" },
              ].map(m => (
                <div key={m.l}>
                  <p style={{ fontSize: 10, color: m.c, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.l}</p>
                  <p style={{ fontFamily: "'Chakra Petch', sans-serif", fontSize: 18, fontWeight: 700 }}>{m.v}g</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 10, fontSize: 11, color: "var(--text-muted)" }}>
              <span>Fiber: {Math.round(plateTotals.fiber)}g</span>
              <span>Sugar: {Math.round(plateTotals.sugar)}g</span>
              <span>Sodium: {Math.round(plateTotals.sodium)}mg</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
