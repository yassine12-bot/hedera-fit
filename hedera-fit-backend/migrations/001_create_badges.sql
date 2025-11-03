-- Migration: Créer la table badges (VERSION DÉCORATIVE - Sans bonus)
-- Date: 2025-11-02

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  rarity TEXT CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  attributes TEXT,
  nft_token_id TEXT,
  nft_serial_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_unique ON badges(user_id, badge_type);

CREATE TABLE IF NOT EXISTS badge_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_type TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  rarity TEXT CHECK(rarity IN ('common', 'rare', 'epic', 'legendary')) DEFAULT 'common',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  category TEXT DEFAULT 'general'
);

INSERT OR IGNORE INTO badge_definitions (badge_type, name, description, image_url, rarity, requirement_type, requirement_value, sort_order, category) VALUES
('ROOKIE', 'Rookie Athlete', 'Completed your first 10 workouts', 'https://cdn.example.com/badges/rookie.png', 'common', 'workout_count', 10, 1, 'fitness'),
('VETERAN', 'Veteran Warrior', 'Completed 100 workouts - Dedication!', 'https://cdn.example.com/badges/veteran.png', 'rare', 'workout_count', 100, 2, 'fitness'),
('CHAMPION', 'Fitness Champion', 'Completed 500 workouts - True dedication!', 'https://cdn.example.com/badges/champion.png', 'epic', 'workout_count', 500, 3, 'fitness'),
('LEGEND', 'Legendary Athlete', 'Completed 1000 workouts - You are a legend!', 'https://cdn.example.com/badges/legend.png', 'legendary', 'workout_count', 1000, 4, 'fitness'),
('SOCIAL', 'Social Butterfly', 'Posted 50 comments in the community', 'https://cdn.example.com/badges/social.png', 'common', 'comment_count', 50, 5, 'social'),
('MOTIVATOR', 'Community Motivator', 'Posted 100 positive comments - Spreading positivity!', 'https://cdn.example.com/badges/motivator.png', 'rare', 'positive_comments', 100, 6, 'social'),
('INFLUENCER', 'Community Influencer', 'Posted 500 positive comments - You inspire others!', 'https://cdn.example.com/badges/influencer.png', 'epic', 'positive_comments', 500, 7, 'social'),
('STREAKER', 'Streak Starter', 'Maintained a 7-day workout streak', 'https://cdn.example.com/badges/streaker.png', 'common', 'streak_days', 7, 8, 'streak'),
('CONSISTENT', 'Consistency King', 'Maintained a 30-day workout streak', 'https://cdn.example.com/badges/consistent.png', 'epic', 'streak_days', 30, 9, 'streak'),
('UNSTOPPABLE', 'Unstoppable Force', 'Maintained a 100-day workout streak!', 'https://cdn.example.com/badges/unstoppable.png', 'legendary', 'streak_days', 100, 10, 'streak');

CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY,
  workout_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  positive_comment_count INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_workout_date DATE,
  total_workouts_time INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE VIEW IF NOT EXISTS unlockable_badges AS
SELECT 
  u.id as user_id,
  u.name as username,
  bd.badge_type,
  bd.name,
  bd.description,
  bd.image_url,
  bd.rarity,
  bd.category,
  bd.requirement_type,
  bd.requirement_value,
  bd.sort_order,
  CASE 
    WHEN bd.requirement_type = 'workout_count' THEN COALESCE(us.workout_count, 0)
    WHEN bd.requirement_type = 'comment_count' THEN COALESCE(us.comment_count, 0)
    WHEN bd.requirement_type = 'positive_comments' THEN COALESCE(us.positive_comment_count, 0)
    WHEN bd.requirement_type = 'streak_days' THEN COALESCE(us.current_streak, 0)
  END as current_progress,
  CASE 
    WHEN bd.requirement_type = 'workout_count' THEN COALESCE(us.workout_count, 0) >= bd.requirement_value
    WHEN bd.requirement_type = 'comment_count' THEN COALESCE(us.comment_count, 0) >= bd.requirement_value
    WHEN bd.requirement_type = 'positive_comments' THEN COALESCE(us.positive_comment_count, 0) >= bd.requirement_value
    WHEN bd.requirement_type = 'streak_days' THEN COALESCE(us.current_streak, 0) >= bd.requirement_value
  END as can_unlock,
  b.id as already_unlocked
FROM users u
CROSS JOIN badge_definitions bd
LEFT JOIN user_stats us ON u.id = us.user_id
LEFT JOIN badges b ON u.id = b.user_id AND bd.badge_type = b.badge_type;

CREATE VIEW IF NOT EXISTS badge_leaderboard AS
SELECT 
  u.id as user_id,
  u.name as username,
  COUNT(b.id) as total_badges,
  COUNT(CASE WHEN b.rarity = 'common' THEN 1 END) as common_badges,
  COUNT(CASE WHEN b.rarity = 'rare' THEN 1 END) as rare_badges,
  COUNT(CASE WHEN b.rarity = 'epic' THEN 1 END) as epic_badges,
  COUNT(CASE WHEN b.rarity = 'legendary' THEN 1 END) as legendary_badges,
  COALESCE(us.workout_count, 0) as workout_count,
  COALESCE(us.comment_count, 0) as comment_count,
  COALESCE(us.longest_streak, 0) as longest_streak
FROM users u
LEFT JOIN badges b ON u.id = b.user_id
LEFT JOIN user_stats us ON u.id = us.user_id
GROUP BY u.id
ORDER BY total_badges DESC, legendary_badges DESC, epic_badges DESC;

CREATE VIEW IF NOT EXISTS recent_badges AS
SELECT 
  b.*,
  u.name as username,
  bd.category
FROM badges b
JOIN users u ON b.user_id = u.id
JOIN badge_definitions bd ON b.badge_type = bd.badge_type
ORDER BY b.created_at DESC
LIMIT 20;