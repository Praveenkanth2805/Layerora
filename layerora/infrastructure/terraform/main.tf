# VPC (simplified – use default VPC for MVP)
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# RDS (PostgreSQL)
resource "aws_db_instance" "layerora_db" {
  identifier           = "${var.project_name}-db-${var.environment}"
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t4g.micro"
  allocated_storage    = 20
  storage_encrypted    = true
  db_name              = "layerora"
  username             = "layerora"
  password             = var.db_password
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = true
  publicly_accessible  = false
  tags = {
    Environment = var.environment
  }
}

# S3 bucket for object storage
resource "aws_s3_bucket" "layerora_storage" {
  bucket = var.s3_bucket_name
  force_destroy = true
  tags = {
    Environment = var.environment
  }
}

resource "aws_s3_bucket_public_access_block" "layerora_storage_block" {
  bucket = aws_s3_bucket.layerora_storage.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Security Groups
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Allow PostgreSQL access from ECS tasks"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${var.project_name}-ecs-tasks-sg"
  description = "Allow outbound internet for ECS tasks"
  vpc_id      = data.aws_vpc.default.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "layerora_cluster" {
  name = "${var.project_name}-cluster-${var.environment}"
}

# ECR repositories for backend and frontend
resource "aws_ecr_repository" "backend" {
  name = "${var.project_name}/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "frontend" {
  name = "${var.project_name}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# IAM roles and ECS task definitions would be added here in a full setup.
# For brevity, we stop at the core resources; the rest can be expanded.