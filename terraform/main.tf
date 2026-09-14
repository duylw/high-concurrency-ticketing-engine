terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-1" # Singapore
}

# ==============================================================================
# 1. Tự động tạo Security Group (Mở cổng 22 SSH, 80 HTTP Nginx, 443 HTTPS)
# ==============================================================================
resource "aws_security_group" "web_sg" {
  name        = "ticketing-web-sg"
  description = "Allow HTTP, HTTPS and SSH traffic for ticketing platform"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP Nginx Gateway"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ==============================================================================
# 2. Khởi tạo EC2 Instance chuẩn cấu hình (c7i-flex.large, 2vCPU, 4GiB RAM)
# ==============================================================================
resource "aws_instance" "app_server" {
  ami           = "ami-03acbba64aef9bf5c" # Canonical, Ubuntu 24.04 LTS (amd64)
  instance_type = "c7i-flex.large"        # 2 vCPU, 4 GiB memory (Compute Optimized Flex)
  key_name      = "ticketing-key"         # Key pair có sẵn đã tạo trên AWS Console & lưu ở ~/.ssh/ticketing-key.pem

  vpc_security_group_ids = [aws_security_group.web_sg.id]

  root_block_device {
    volume_size           = 20 # 20 GiB gp3
    volume_type           = "gp3"
    delete_on_termination = true
  }

  # Cloud-init: Tự động cập nhật hệ thống và cài đặt Docker ngay khi vừa bật máy
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y ca-certificates curl gnupg
              curl -fsSL https://get.docker.com | sh
              usermod -aG docker ubuntu
              systemctl enable docker
              systemctl start docker
              EOF

  tags = {
    Name = "Ticketing-Engine-Production"
  }
}

# ==============================================================================
# 3. In ra thông tin kết nối sau khi tạo xong
# ==============================================================================
output "public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.app_server.public_ip
}

output "ssh_command" {
  description = "Quick SSH command to connect to your instance"
  value       = "ssh -i ~/.ssh/ticketing-key.pem ubuntu@${aws_instance.app_server.public_ip}"
}
