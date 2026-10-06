variable "aws_region" {
  description = "AWS region for HomeVault infrastructure"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 instance type for HomeVault"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "AWS EC2 key pair name"
  type        = string
  default     = "vault"
}

variable "ami_id" {
  description = "Ubuntu AMI ID for ap-south-1"
  type        = string
  default     = "ami-01a00762f46d584a1"
}
