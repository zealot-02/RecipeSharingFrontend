import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Compass,
  Flame,
  Heart,
  LoaderCircle,
  LogOut,
  Plus,
  Search,
  ShieldCheck,
  Star,
  UserRound,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import { loginUser, registerUser } from './api/auth.js';
import { createRecipe, deleteRecipe, favoriteRecipe, fetchRecipes, rateRecipe } from './api/recipes.js';
import RecipeCard from './components/RecipeCard.jsx';
import { useAuth } from './context/AuthContext.jsx';

const initialForm = {
  title: '',
  description: '',
  category: 'Veg',
  cookTime: '',
  servings: '',
  ingredients: '',
  steps: '',
  image: '',
};

const navItems = [
  { id: 'home', label: 'Home', icon: Compass },
  { id: 'trending', label: 'Trending Recipes', icon: Flame },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'profile', label: 'Your Information', icon: UserRound },
];

const normalizeRecipe = (recipe, userId) => {
  const likes = Array.isArray(recipe.likes) ? recipe.likes : [];
  const favorites = Array.isArray(recipe.favorites) ? recipe.favorites : [];
  const ratings = Array.isArray(recipe.ratings) ? recipe.ratings : [];
  const currentRating = ratings.find((entry) => String(entry.user) === String(userId));

  return {
    ...recipe,
    likedByViewer: likes.some((entry) => String(entry) === String(userId)),
    favoritedByViewer: favorites.some((entry) => String(entry) === String(userId)),
    userRating: currentRating?.value ?? 0,
  };
};

function App() {
  const { isAuthenticated, login, logout, user } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [showTopChrome, setShowTopChrome] = useState(true);
  const [currentPage, setCurrentPage] = useState('home');
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [ratingRecipe, setRatingRecipe] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [recipeSubmitting, setRecipeSubmitting] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [recipeForm, setRecipeForm] = useState(initialForm);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await fetchRecipes();
      setRecipes((data.recipes || []).map((recipe) => normalizeRecipe(recipe, user?.id)));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load recipes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecipes();
  }, [user?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowIntro(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopChrome(window.scrollY <= 4);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const searchedRecipes = useMemo(() => {
    if (!query.trim()) {
      return recipes;
    }

    const search = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      return (
        recipe.title.toLowerCase().includes(search) ||
        recipe.category.toLowerCase().includes(search) ||
        recipe.description?.toLowerCase().includes(search)
      );
    });
  }, [query, recipes]);

  const trendingRecipes = useMemo(() => {
    return [...searchedRecipes].sort((left, right) => (right.likes?.length || 0) - (left.likes?.length || 0));
  }, [searchedRecipes]);

  const favoriteRecipes = useMemo(() => {
    return searchedRecipes.filter((recipe) => recipe.favoritedByViewer);
  }, [searchedRecipes]);

  const yourRecipes = useMemo(() => {
    return searchedRecipes.filter((recipe) => recipe.author?._id === user?.id);
  }, [searchedRecipes, user?.id]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    try {
      setAuthSubmitting(true);

      const action = authMode === 'login' ? loginUser : registerUser;
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : authForm;

      const response = await action(payload);
      login(response.user, response.token);
      setAuthForm({ name: '', email: '', password: '' });
      setShowAuthPanel(false);
      setCurrentPage('profile');
      toast.success(response.message);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Authentication failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRecipeSubmit = async (event) => {
    event.preventDefault();

    try {
      setRecipeSubmitting(true);
      const payload = {
        ...recipeForm,
        cookTime: Number(recipeForm.cookTime) || 0,
        servings: Number(recipeForm.servings) || 1,
        ingredients: recipeForm.ingredients.split('\n').map((item) => item.trim()).filter(Boolean),
        steps: recipeForm.steps.split('\n').map((item) => item.trim()).filter(Boolean),
      };

      const created = normalizeRecipe(await createRecipe(payload), user?.id);
      setRecipes((current) => [created, ...current]);
      setRecipeForm(initialForm);
      setCurrentPage('home');
      toast.success('Recipe created.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to create recipe.');
    } finally {
      setRecipeSubmitting(false);
    }
  };

  const handleDelete = async (recipeId) => {
    try {
      await deleteRecipe(recipeId);
      setRecipes((current) => current.filter((recipe) => recipe._id !== recipeId));
      toast.success('Recipe deleted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete recipe.');
    }
  };

  const handleFavorite = async (recipeId) => {
    try {
      const result = await favoriteRecipe(recipeId);
      setRecipes((current) =>
        current.map((recipe) =>
          recipe._id === recipeId
            ? {
                ...recipe,
                favorites: Array.from({ length: result.favorites || 0 }, (_, index) => index),
                favoritedByViewer: result.favorited,
              }
            : recipe,
        ),
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Please log in to save favorites.');
    }
  };

  const openRatingModal = (recipe) => {
    if (!isAuthenticated) {
      toast.error('Please log in to rate recipes.');
      return;
    }

    setRatingRecipe(recipe);
    setRatingValue(recipe.userRating || Math.round(recipe.rating) || 0);
  };

  const submitRating = async () => {
    if (!ratingRecipe || !ratingValue) {
      toast.error('Select a rating first.');
      return;
    }

    try {
      setRatingSubmitting(true);
      const result = await rateRecipe(ratingRecipe._id, ratingValue);
      setRecipes((current) =>
        current.map((recipe) =>
          recipe._id === ratingRecipe._id
            ? {
                ...recipe,
                rating: result.rating,
                userRating: result.userRating,
              }
            : recipe,
        ),
      );
      setRatingRecipe(null);
      setRatingValue(0);
      toast.success('Rating submitted.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to submit rating.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const renderRecipeGrid = (items, emptyMessage) => {
    if (loading) {
      return (
        <div className="loading-state">
          <LoaderCircle className="spin" size={22} />
          <span>Fetching recipes...</span>
        </div>
      );
    }

    if (items.length === 0) {
      return <div className="empty-state">{emptyMessage}</div>;
    }

    return (
      <div className="recipe-grid">
        {items.map((recipe) => (
          <RecipeCard
            key={recipe._id}
            onDelete={handleDelete}
            onFavorite={handleFavorite}
            onRate={openRatingModal}
            recipe={recipe}
            showActions={user?.id === recipe.author?._id}
          />
        ))}
      </div>
    );
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'privacy':
        return (
          <section className="panel stack page-panel">
            <div className="panel-header">
              <h2>Privacy Policy</h2>
              <p>Your data is safe and protected.</p>
            </div>
            <p>
              We respect your privacy and ensure that your personal information is handled with care and not shared without your consents.
            </p>
          </section>
        );
      case 'terms':
        return (
          <section className="panel stack page-panel">
            <div className="panel-header">
              <h2>Terms & Conditions</h2>
              <p>Understand the rules of using FoodVerse.</p>
            </div>
            <p>
              By using this platform, you agree to follow our community guidelines, respect intellectual property rights, and policies.
            </p>
          </section>
        );
      case 'contact':
        return (
          <section className="panel stack page-panel">
            <div className="panel-header">
              <h2>Contact Us</h2>
              <p>We would love to hear from you!</p>
            </div>
            <p>
              Email: helpforzealot@gmail.com 
            </p>
          </section>
        );
      case 'trending':
        return (
          <section className="panel stack page-panel">
            <div className="panel-header">
              <h2>Trending Recipes</h2>
              <p>Recipes sorted by engagement and ready to explore.</p>
            </div>
            {renderRecipeGrid(trendingRecipes, 'No trending recipes found yet.')}
          </section>
        );
      case 'favorites':
        return (
          <section className="panel stack page-panel">
            <div className="panel-header">
              <h2>Your Favorites</h2>
              <p>Everything you have saved in one place.</p>
            </div>
            {renderRecipeGrid(
              favoriteRecipes,
              isAuthenticated ? 'You have not saved any favorites yet.' : 'Login to save favorite recipes.',
            )}
          </section>
        );
      case 'profile':
        return (
          <section className="content-grid page-panel">
            <aside className="panel stack">
              <div className="panel-header">
                <h2>Your Information</h2>
                <p>Your account details and quick actions.</p>
              </div>

              {isAuthenticated ? (
                <div className="profile-card">
                  <div className="profile-icon">
                    <UserRound size={28} />
                  </div>
                  <strong>{user?.name}</strong>
                  <span>{user?.email}</span>
                  <button className="ghost-button" onClick={logout} type="button">
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="empty-state compact-state">
                  Use the top-right login or signup button to access your profile.
                </div>
              )}
            </aside>

            <aside className="panel stack">
              <div className="panel-header">
                <h2>Create Recipe</h2>
                <p>Publishing tools stay available inside your information page.</p>
              </div>

              <form className="stack" onSubmit={handleRecipeSubmit}>
                <label className="field">
                  <span>Title</span>
                  <input
                    value={recipeForm.title}
                    onChange={(event) => setRecipeForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Smoky tomato pasta"
                    required
                  />
                </label>

                <label className="field">
                  <span>Description</span>
                  <textarea
                    value={recipeForm.description}
                    onChange={(event) =>
                      setRecipeForm((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Short summary of the dish"
                    rows="3"
                  />
                </label>

                <div className="row">
                  <label className="field">
                    <span>Category</span>
                    <select
                      className="glass-select"
                      value={recipeForm.category}
                      onChange={(event) => setRecipeForm((current) => ({ ...current, category: event.target.value }))}
                    >
                      <option value="Veg">Veg</option>
                      <option value="Non-Veg">Non-Veg</option>
                      <option value="Dessert">Dessert</option>
                      <option value="Drinks">Drinks</option>
                      <option value="Breakfast">Breakfast</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Cook time</span>
                    <input
                      type="number"
                      min="0"
                      value={recipeForm.cookTime}
                      onChange={(event) => setRecipeForm((current) => ({ ...current, cookTime: event.target.value }))}
                      placeholder="30"
                    />
                  </label>
                </div>

                <div className="row">
                  <label className="field">
                    <span>Servings</span>
                    <input
                      type="number"
                      min="1"
                      value={recipeForm.servings}
                      onChange={(event) => setRecipeForm((current) => ({ ...current, servings: event.target.value }))}
                      placeholder="4"
                    />
                  </label>

                  <label className="field">
                    <span>Image URL</span>
                    <input
                      value={recipeForm.image}
                      onChange={(event) => setRecipeForm((current) => ({ ...current, image: event.target.value }))}
                      placeholder="https://..."
                    />
                  </label>
                </div>

                <label className="field">
                  <span>Ingredients</span>
                  <textarea
                    value={recipeForm.ingredients}
                    onChange={(event) =>
                      setRecipeForm((current) => ({ ...current, ingredients: event.target.value }))
                    }
                    placeholder="One ingredient per line"
                    rows="4"
                    required
                  />
                </label>

                <label className="field">
                  <span>Steps</span>
                  <textarea
                    value={recipeForm.steps}
                    onChange={(event) => setRecipeForm((current) => ({ ...current, steps: event.target.value }))}
                    placeholder="One step per line"
                    rows="4"
                    required
                  />
                </label>

                <button className="primary-button" disabled={!isAuthenticated || recipeSubmitting} type="submit">
                  {recipeSubmitting ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
                  Create recipe
                </button>
              </form>
            </aside>
          </section>
        );
      case 'home':
      default:
        return (
          <section className="panel stack page-panel">
            <div className="panel-header inline-header">
              <div>
                <h2>Latest Recipes</h2>
                <p>{loading ? 'Loading recipes from the API.' : `${searchedRecipes.length} recipes loaded.`}</p>
              </div>
              <button className="ghost-button" onClick={loadRecipes} type="button">
                Refresh
              </button>
            </div>
            {renderRecipeGrid(searchedRecipes, 'No recipes matched your search.')}
          </section>
        );
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <AnimatePresence>
        {showIntro ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="intro-screen"
            exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeInOut' } }}
            initial={{ opacity: 1 }}
          >
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="intro-card"
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <motion.span
                animate={{ opacity: 1, letterSpacing: '0.28em' }}
                className="intro-eyebrow"
                initial={{ opacity: 0, letterSpacing: '0.45em' }}
                transition={{ delay: 0.15, duration: 0.6 }}
              >
                Recipe Sharing
              </motion.span>
              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 18 }}
                transition={{ delay: 0.3, duration: 0.65 }}
              >
                Cook. Share. Repeat.
              </motion.h1>
              <motion.div
                animate={{ scaleX: 1 }}
                className="intro-bar"
                initial={{ scaleX: 0 }}
                transition={{ delay: 0.45, duration: 0.9, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="app-shell">
        <section className={showTopChrome ? 'hero-actions hero-actions-sticky' : 'hero-actions hero-actions-sticky is-hidden'}>
          <div className="unified-nav">
            <div className="search-field">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search recipes or category"
              />
            </div>

            <nav className="nav-strip">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    className={active ? 'nav-pill active' : 'nav-pill'}
                    onClick={() => setCurrentPage(item.id)}
                    type="button"
                  >
                    <Icon size={16} />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {isAuthenticated ? (
              <button className="primary-button auth-button" onClick={() => setCurrentPage('profile')} type="button">
                <UserRound size={16} />
                {user?.name}
              </button>
            ) : (
              <button className="primary-button auth-button" onClick={() => setShowAuthPanel(true)} type="button">
                <ShieldCheck size={16} />
                Login / Signup
              </button>
            )}
          </div>
        </section>

        {currentPage === 'home' ? (
          <section className="hero-panel">
            <div className="hero-copy">
              <span className="eyebrow">Production-ready recipe sharing</span>
              <h1>Elevate Your Cooking Experience with Smart Recipe Management</h1>
              <p>FoodVerse is a modern platform designed to help users explore, organize, and share recipes efficiently. 
  Powered by clean design and intelligent features, it enhances your cooking journey with simplicity and innovation.</p>
            </div>
          </section>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 18 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>

        <footer className="footer-bar">
          <div>
            <strong>FoodVerse</strong>
            <span>Transform your cooking journey with a smarter way to discover and share recipes.</span>
          </div>
          <div className="footer-links">
            <span>Copyright © 2026 FoodVerse</span>
            <span className="footer-link" onClick={() => setCurrentPage("privacy")}>
              Privacy
            </span>
            <span className="footer-link" onClick={() => setCurrentPage("terms")}>
              Terms
            </span>
            <span className="footer-link" onClick={() => setCurrentPage("contact")}>
              Contact
            </span>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {ratingRecipe ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => {
              setRatingRecipe(null);
              setRatingValue(0);
            }}
          >
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="auth-modal panel"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <h2>Rate Recipe</h2>
                <p>{ratingRecipe.title}</p>
              </div>

              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className={value <= ratingValue ? 'star-button active' : 'star-button'}
                    onClick={() => setRatingValue(value)}
                    type="button"
                  >
                    <Star size={22} fill="currentColor" />
                  </button>
                ))}
              </div>

              <button
                className="primary-button"
                disabled={ratingSubmitting || !ratingValue}
                onClick={submitRating}
                type="button"
              >
                {ratingSubmitting ? <LoaderCircle className="spin" size={16} /> : <Star size={16} />}
                Submit rating
              </button>
            </motion.div>
          </motion.div>
        ) : null}

        {showAuthPanel ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="modal-backdrop"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={() => setShowAuthPanel(false)}
          >
            <motion.div
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="auth-modal panel"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panel-header">
                <h2>{authMode === 'login' ? 'Login' : 'Create account'}</h2>
                <p>Authenticate here without leaving the page.</p>
              </div>

              <form className="stack" onSubmit={handleAuthSubmit}>
                {authMode === 'register' ? (
                  <label className="field">
                    <span>Name</span>
                    <input
                      value={authForm.name}
                      onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Your name"
                      required
                    />
                  </label>
                ) : null}

                <label className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="chef@example.com"
                    required
                  />
                </label>

                <label className="field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </label>

                <button className="primary-button" disabled={authSubmitting} type="submit">
                  {authSubmitting ? <LoaderCircle className="spin" size={16} /> : <ShieldCheck size={16} />}
                  {authMode === 'login' ? 'Login' : 'Create account'}
                </button>

                <button
                  className="text-button"
                  onClick={() => setAuthMode((current) => (current === 'login' ? 'register' : 'login'))}
                  type="button"
                >
                  {authMode === 'login' ? 'Need an account? Register.' : 'Already registered? Login.'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

export default App;
