terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  required_version = ">= 1.14.0"
}

provider "aws" {
  region = var.aws_region
}

resource "aws_instance" "homevault" {
  ami           = var.ami_id
  instance_type = var.instance_type

  key_name = var.key_name

  tags = {
    Name = "homevault-server"
  }
}
