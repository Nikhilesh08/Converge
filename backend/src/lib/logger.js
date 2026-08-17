const getTimestamp = () => new Date().toISOString();

export const enableTerminalLogging = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    originalLog(`[${getTimestamp()}]`, ...args);
  };

  console.error = (...args) => {
    originalError(`[${getTimestamp()}] ERROR`, ...args);
  };

  console.warn = (...args) => {
    originalWarn(`[${getTimestamp()}] WARN`, ...args);
  };
};

export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    console.log(
      `${method} ${originalUrl} -> ${res.statusCode} (${duration}ms)`,
    );
  });

  next();
};
