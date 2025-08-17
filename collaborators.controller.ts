import {
  Collaborator,
  CollaboratorCard,
  CourseRow,
  getCurrentUserID,
  escapeSQLString,
  validateNumericId,
  sendJSON,
  sendError,
  logWithPrefix,
  ActiveLearningDocument,
} from "./core.types";

/**
 * Основная функция-контроллер для веб-шаблона.
 * Определяет действие и вызывает соответствующий обработчик.
 */
function main(): void {
  CurResponse.SetHeader("Content-Type", "application/json; charset=utf-8");

  try {
    const action = CurRequest.Query.action;

    switch (action) {
      case "get_subordinates":
        handleGetSubordinates();
        break;
      case "get_collaborator_card":
        handleGetCollaboratorCard();
        break;
      case "get_collaborator_courses":
        handleGetCollaboratorCourses();
        break;
      case "assign_course":
        handleAssignCourse();
        break;
      default:
        sendError(400, "Bad Request: Unknown action");
    }
  } catch (e) {
    logWithPrefix("WEB_TEMPLATE", "error", `Unhandled error: ${e.message}`);
    sendError(500, `Internal Server Error: ${e.message}`);
  }
}

/**
 * Обработчик для получения списка подчинённых с пагинацией и поиском.
 * GET /?action=get_subordinates&fullname=Иванов&page=1&pageSize=20
 */
function handleGetSubordinates(): void {
  const page = Math.max(1, parseInt(CurRequest.Query.page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(CurRequest.Query.pageSize, 10) || 20)
  );
  const offset = (page - 1) * pageSize;
  const fullnameSearch = CurRequest.Query.fullname || "";

  // Безопасное экранирование для поиска (SQL Injection)
  const searchPattern = `%${escapeSQLString(fullnameSearch)}%`;
  const currentUserId = validateNumericId(getCurrentUserID());

  if (!currentUserId) {
    return sendError(401, "Unauthorized: Invalid user context");
  }

  const query = `
      SELECT
        c.id AS id,
        c.fullname AS fullname,
        c.position_name AS position_name,
        c.is_dismiss AS is_dismiss
      FROM
        collaborators AS c
      INNER JOIN
        func_managers AS fm ON fm.manager_id = ${currentUserId}
      WHERE
        fm.person_id = c.id
        AND c.fullname LIKE '${searchPattern}'
      ORDER BY
        c.fullname
      OFFSET ${offset} ROWS
      FETCH NEXT ${pageSize} ROWS ONLY;
    `;

  try {
    const result = tools.xquery<Collaborator>(query);
    sendJSON(200, result);
  } catch (e) {
    logWithPrefix(
      "GET_SUBORDINATES",
      "error",
      `Database query failed: ${e.message}`
    );
    sendError(500, "Database error occurred");
  }
}

/**
 * Обработчик для получения карточки сотрудника по ID.
 * GET /?action=get_collaborator_card&id=...
 */
function handleGetCollaboratorCard(): void {
  const collaboratorId = validateNumericId(CurRequest.Query.id);

  if (!collaboratorId) {
    return sendError(
      400,
      'Bad Request: Valid numeric "id" parameter is required'
    );
  }

  const query = `
      SELECT
        id,
        fullname,
        position_name,
        is_dismiss,
        avatar_url
      FROM
        collaborators
      WHERE
        id = ${collaboratorId};
    `;

  try {
    const result = ArrayOptFirstElem<CollaboratorCard>(
      tools.xquery<CollaboratorCard>(query)
    );

    if (!result) {
      return sendError(404, "Not Found: Collaborator not found");
    }

    sendJSON(200, result);
  } catch (e) {
    logWithPrefix(
      "GET_COLLABORATOR_CARD",
      "error",
      `Database query failed: ${e.message}`
    );
    sendError(500, "Database error occurred");
  }
}

/**
 * Обработчик для получения списка курсов сотрудника.
 * GET /?action=get_collaborator_courses&id=...
 */
function handleGetCollaboratorCourses(): void {
  const collaboratorId = validateNumericId(CurRequest.Query.id);

  if (!collaboratorId) {
    return sendError(
      400,
      'Bad Request: Valid numeric "id" parameter is required'
    );
  }

  const query = `
      -- Активные курсы
      SELECT
        al.id AS id,
        'active_learning' AS type,
        al.state_id AS state_id,
        al.course_id AS course_id,
        c.name AS course_name
      FROM
        active_learnings AS al
      INNER JOIN
        courses AS c ON c.id = al.course_id
      WHERE
        al.person_id = ${collaboratorId}
  
      UNION ALL
  
      -- Завершенные курсы
      SELECT
        l.id AS id,
        'learning' AS type,
        l.state_id AS state_id,
        l.course_id AS course_id,
        c.name AS course_name
      FROM
        learnings AS l
      INNER JOIN
        courses AS c ON c.id = l.course_id
      WHERE
        l.person_id = ${collaboratorId};
    `;

  try {
    const result = tools.xquery<CourseRow>(query);
    sendJSON(200, result);
  } catch (e) {
    logWithPrefix(
      "GET_COLLABORATOR_COURSES",
      "error",
      `Database query failed: ${e.message}`
    );
    sendError(500, "Database error occurred");
  }
}

/**
 * Обработчик для назначения курса сотруднику.
 * POST /?action=assign_course
 * Body: { "collaborator_id": "...", "course_id": "..." }
 */
function handleAssignCourse(): void {
  const { collaborator_id, course_id } = CurRequest.Body as {
    collaborator_id: string;
    course_id: string;
  };

  const validCollaboratorId = validateNumericId(collaborator_id);
  const validCourseId = validateNumericId(course_id);

  if (!validCollaboratorId || !validCourseId) {
    return sendError(
      400,
      'Bad Request: Valid numeric "collaborator_id" and "course_id" are required'
    );
  }

  try {
    // Проверяем, что курс не назначен уже
    const existingQuery = `
      SELECT id FROM active_learnings 
      WHERE person_id = ${validCollaboratorId} AND course_id = ${validCourseId}
    `;

    const existing = ArrayOptFirstElem(
      tools.xquery<{ id: number }>(existingQuery)
    );
    if (existing) {
      return sendError(
        409,
        "Conflict: Course already assigned to this collaborator"
      );
    }

    // Создаем новое назначение через API WebTutor
    const newDoc = tools.new_doc_with_key<ActiveLearningDocument>(
      "active_learning",
      null,
      false
    );
    newDoc.Doc.person_id = validCollaboratorId;
    newDoc.Doc.course_id = validCourseId;
    newDoc.Doc.Save();

    const newLearningId = newDoc.Doc.id;

    logWithPrefix(
      "ASSIGN_COURSE",
      "info",
      `Course ${validCourseId} assigned to collaborator ${validCollaboratorId}`
    );

    sendJSON(201, {
      active_learning_id: newLearningId,
      collaborator_id: validCollaboratorId,
      course_id: validCourseId,
    });
  } catch (e) {
    logWithPrefix(
      "ASSIGN_COURSE",
      "error",
      `Failed to assign course: ${e.message}`
    );
    sendError(500, "Failed to assign course");
  }
}

main();
