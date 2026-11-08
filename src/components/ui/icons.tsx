import {
  Banana, Bean, CakeSlice, Cherry, Citrus, Coffee, CookingPot, Croissant, Dessert, EggFried, Grape, Ham, IceCreamCone, Nut, Pizza,
  Apple, Beef, BookOpen, Carrot, Check, Cookie, Droplet, Drumstick, Dumbbell, Egg, Fish, Footprints, Leaf, Milk, Moon,
  Salad, Sandwich, Soup, Sun, Utensils, Wheat, type LucideIcon,
} from 'lucide-react';
import type { Habit, Recipe } from '../../types';

export const RECIPE_ICONS: Record<Recipe['icon'], LucideIcon> = {
  salad: Salad, egg: Egg, fish: Fish, beef: Beef, soup: Soup, wheat: Wheat, apple: Apple, milk: Milk,
  sandwich: Sandwich, carrot: Carrot, drumstick: Drumstick, cookie: Cookie,
  pizza: Pizza, croissant: Croissant, cherry: Cherry, citrus: Citrus, banana: Banana, bean: Bean, nut: Nut, cake: CakeSlice,
  icecream: IceCreamCone, ham: Ham, pot: CookingPot, leaf: Leaf, grape: Grape, eggfried: EggFried, coffee: Coffee, dessert: Dessert,
};

export const HABIT_ICONS: Record<Habit['icon'], LucideIcon> = {
  droplet: Droplet, footprints: Footprints, dumbbell: Dumbbell, utensils: Utensils, moon: Moon, leaf: Leaf, book: BookOpen, sun: Sun, check: Check,
};
