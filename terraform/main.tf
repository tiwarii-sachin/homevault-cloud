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
  region = "ap-south-1"
}

resource "aws_instance" "homevault" {
  ami           = "ami-01a00762f46d584a1"
  instance_type = "t3.micro"

  key_name = "vault"

  tags = {
    Name = "homevault-server"
  }
}
