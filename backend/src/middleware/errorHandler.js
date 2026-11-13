const errorHandler = (err, req, res, next) => {
  void next; // Express identifies error handlers by their four-argument signature.
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Server Error",
    ...(err.code === "PORTFOLIO_MULTIPART_REJECTED" && err.saveState === "failed"
      ? { code: err.code, saveState: "failed" } : {}),
  });
};

export default errorHandler;
