import { motion } from 'framer-motion';
import { Clock3, Heart, Star, Trash2, UserRound } from 'lucide-react';

export default function RecipeCard({
  onDelete,
  onFavorite,
  onRate,
  recipe,
  showActions,
  showFavorite = true,
}) {
  const ratingValue = Number(recipe.rating) > 0 ? Number(recipe.rating).toFixed(1) : '4.8';
  const imageClassName = recipe.image ? 'recipe-image has-image' : 'recipe-image';

  return (
    <motion.article
      animate={{ opacity: 1, y: 0 }}
      className="recipe-card"
      initial={{ opacity: 0, y: 18 }}
      transition={{ duration: 0.28 }}
    >
      <div
        className={imageClassName}
        style={recipe.image ? { backgroundImage: `url(${recipe.image})` } : undefined}
      >
        <span>{recipe.category}</span>
      </div>

      <div className="recipe-body">
        <h3>{recipe.title}</h3>
        <p className="meta">{recipe.description || 'No description provided.'}</p>

        <div className="meta-row">
          <span className="meta">
            <Clock3 size={15} />
            {recipe.cookTime || 0} min
          </span>
          <span className="meta">
            <UserRound size={15} />
            {recipe.author?.name || 'Anonymous'}
          </span>
          <span className="meta">{recipe.category}</span>
        </div>

        <div className="action-row">
          <button className="chip-button" onClick={() => onRate(recipe)} type="button">
            <Star size={15} />
            Rating {ratingValue}
          </button>

          {showFavorite ? (
            <button className="chip-button" onClick={() => onFavorite(recipe._id)} type="button">
              <Heart size={15} />
              {recipe.favoritedByViewer ? 'Saved' : 'Favorite'}
            </button>
          ) : null}

          {showActions ? (
            <button
              className="chip-button danger"
              onClick={() => onDelete(recipe._id)}
              type="button"
            >
              <Trash2 size={15} />
              Delete
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
