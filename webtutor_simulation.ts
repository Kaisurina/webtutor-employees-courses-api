// --- WebTutor Environment Simulation ---
// Этот файл содержит все типы и объявления для симуляции окружения WebTutor

// === Базовые типы данных ===

export type Collaborator = {
  id: string;
  fullname: string;
  position_name: string;
  is_dismiss: boolean;
};

export type CollaboratorCard = {
  id: string;
  fullname: string;
  position_name: string;
  is_dismiss: boolean;
  avatar_url?: string;
};

export type CourseRow = {
  id: string;
  type: "active_learning" | "learning";
  state_id: number;
  course_id: string;
  course_name: string;
};

export type IncompleteItem = {
  collaborator_id: number;
  fullname: string;
  item_name: string;
  item_type: "Курс" | "Тест";
};

export type GroupedItems = {
  [collaboratorId: number]: {
    fullname: string;
    courses: string[];
    tests: string[];
  };
};

// === WebTutor Global Objects ===

declare global {
  /**
   * Симуляция объекта CurRequest
   */
  const CurRequest: {
    Query: { [key: string]: string };
    Body: { [key: string]: any };
  };

  /**
   * Симуляция объекта CurResponse
   */
  const CurResponse: {
    SetHeader(name: string, value: string): void;
    SetStatus(code: number, message?: string): void;
    SetBody(body: string): void;
  };

  const tools: {
    /**
     * Выполняет SQL запрос(симуляций иксквери в тюторе)
     * @param query - SQL запрос
     * @returns результат запроса
     */
    xquery(query: string): any[];
    /**
     * Создает новый документ с ключом
     * @param catalogName - название каталога
     * @param key - ключ
     * @param useParentKey - использовать ключ родителя
     * @returns результат запроса
     */
    new_doc_with_key(
      catalogName: string,
      key: any,
      useParentKey: boolean
    ): {
      Doc: {
        id: number;
        person_id?: number;
        course_id?: number;
        test_id?: number;
        Save(): void;
      };
    };
    /**
     * Создает уведомление
     * @param options - параметры уведомления
     */
    create_notification(options: {
      recipient_person_id: number;
      subject: string;
      body: string;
    }): void;
  };

  const log: {
    info(message: string): void;
    error(message: string): void;
    warn(message: string): void;
    debug(message: string): void;
  };
  /**
   * Получает первый элемент массива
   * @param arr - массив
   * @returns первый элемент массива
   */
  function ArrayOptFirstElem<T>(arr: T[]): T | undefined;
}

// === Utility Functions ===

/**
 * Получает ID текущего пользователя
 * В реальной среде WebTutor это значение доступно глобально
 * @returns ID текущего пользователя
 */
export function getCurrentUserID(): string {
  // В реальной реализации здесь будет код получения ID из контекста WebTutor
  return "%%curUserID%%"; // Заглушка для разработки
}

/**
 * Безопасное экранирование строк для SQL запросов
 * Защита от SQL инъекций
 * @param value - строка для экранирования
 * @returns экранированная строка
 */
export function escapeSQLString(value: string): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/'/g, "''").replace(/[%_]/g, " ");
}

/**
 * Валидация числового ID
 * @param id - строка для валидации
 * @returns числовой ID или null
 */
export function validateNumericId(id: string | undefined): number | null {
  if (!id) return null;
  const numId = parseInt(id, 10);
  return isNaN(numId) || numId <= 0 ? null : numId;
}

/**
 * Стандартная отправка JSON ответа
 * @param status - статус ответа
 * @param data - данные для отправки
 */
export function sendJSON(status: number, data: any): void {
  CurResponse.SetStatus(status);
  CurResponse.SetHeader("Content-Type", "application/json; charset=utf-8");
  CurResponse.SetBody(JSON.stringify(data, null, 2));
}

/**
 * Стандартная отправка ошибки
 * @param status - статус ответа
 * @param message - сообщение об ошибке
 */
export function sendError(status: number, message: string): void {
  CurResponse.SetStatus(status);
  CurResponse.SetHeader("Content-Type", "application/json; charset=utf-8");
  CurResponse.SetBody(
    JSON.stringify({
      error: message,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Логирование с префиксом
 * @param prefix - префикс для логирования
 * @param level - уровень логирования
 * @param message - сообщение для логирования
 */
export function logWithPrefix(
  prefix: string,
  level: "info" | "error" | "warn" | "debug",
  message: string
): void {
  const fullMessage = `[${prefix}] ${message}`;
  switch (level) {
    case "info":
      log.info(fullMessage);
      break;
    case "error":
      log.error(fullMessage);
      break;
    case "warn":
      log.warn(fullMessage);
      break;
    case "debug":
      log.debug(fullMessage);
      break;
  }
}

export {};
