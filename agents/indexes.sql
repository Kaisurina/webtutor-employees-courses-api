-- Индексы для оптимизации производительности агента

-- Индекс для таблицы active_learnings
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_active_learnings_person_state' AND object_id = OBJECT_ID('active_learnings'))
CREATE INDEX idx_active_learnings_person_state 
ON active_learnings(person_id, state_id);

-- Индекс для таблицы active_testings  
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_active_testings_person_state' AND object_id = OBJECT_ID('active_testings'))
CREATE INDEX idx_active_testings_person_state 
ON active_testings(person_id, state_id);

-- Индекс для таблицы collaborators
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_collaborators_dismiss' AND object_id = OBJECT_ID('collaborators'))
CREATE INDEX idx_collaborators_dismiss 
ON collaborators(is_dismiss);

-- Индекс для таблицы notifications (защита от дублирования)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_notifications_recipient_date_subject' AND object_id = OBJECT_ID('notifications'))
CREATE INDEX idx_notifications_recipient_date_subject 
ON notifications(recipient_id, create_date, subject);

-- Индекс для состояний обучения
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_learning_states_active' AND object_id = OBJECT_ID('learning_states'))
CREATE INDEX idx_learning_states_active 
ON learning_states(is_active);

-- Индекс для состояний тестирования
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'idx_testing_states_active' AND object_id = OBJECT_ID('testing_states'))
CREATE INDEX idx_testing_states_active 
ON testing_states(is_active);
