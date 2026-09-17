SELECT
  scope.dimension_id,
  scope.dimension_label,
  scope.evidence_status,
  scope.evidence_text,
  scope.decision_effect,
  (SELECT value FROM dataset_metadata WHERE key = 'question') AS product_question,
  (SELECT value FROM dataset_metadata WHERE key = 'decision') AS decision_text,
  CAST((SELECT value FROM dataset_metadata WHERE key = 'target_rate_pct') AS REAL) AS target_rate_pct
FROM dataset_scope AS scope
ORDER BY scope.sort_order;
