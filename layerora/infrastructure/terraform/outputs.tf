output "db_endpoint" {
  value       = aws_db_instance.layerora_db.endpoint
  description = "RDS instance endpoint"
  sensitive   = true
}

output "s3_bucket_name" {
  value       = aws_s3_bucket.layerora_storage.bucket
  description = "S3 bucket name"
}

output "ecr_backend_repo" {
  value       = aws_ecr_repository.backend.repository_url
  description = "ECR repository URL for backend"
}

output "ecr_frontend_repo" {
  value       = aws_ecr_repository.frontend.repository_url
  description = "ECR repository URL for frontend"
}