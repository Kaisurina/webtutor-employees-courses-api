-- Индексы для оптимизации производительности агента

-- Индекс для таблицы active_learnings
CREATE INDEX IF NOT EXISTS idx_active_learnings_person_state 
ON active_learnings(person_id, state_id);

-- Индекс для таблицы active_testings  
CREATE INDEX IF NOT EXISTS idx_active_testings_person_state 
ON active_testings(person_id, state_id);

-- Индекс для таблицы collaborators
CREATE INDEX IF NOT EXISTS idx_collaborators_dismiss 
ON collaborators(is_dismiss);

-- Индекс для таблицы notifications (защита от дублирования)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_date_subject 
ON notifications(recipient_id, create_date, subject);

-- Индекс для состояний обучения
CREATE INDEX IF NOT EXISTS idx_learning_states_active 
ON learning_states(is_active);

-- Индекс для состояний тестирования
CREATE INDEX IF NOT EXISTS idx_testing_states_active 
ON testing_states(is_active);
