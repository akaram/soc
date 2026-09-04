import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-registration-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="success-container">
      <div class="success-content">
        <div class="success-icon">
          <div class="checkmark-circle">
            <div class="checkmark"></div>
          </div>
        </div>

        <h1>Registration Successful! 🎉</h1>
        <p class="success-message">
          Your account has been created successfully and is under review.
        </p>

        <div class="registration-details">
          <div class="detail-card">
            <span class="detail-label">Registration ID:</span>
            <span class="detail-value">{{ registrationId }}</span>
          </div>
          
          <div class="info-box">
            <h3>📧 What's Next?</h3>
            <ul>
              <li>✓ You will receive a confirmation email shortly</li>
              <li>✓ Your documents are being verified by our team</li>
              <li>✓ Approval typically takes 24-48 hours</li>
              <li>✓ You'll be notified via email once approved</li>
            </ul>
          </div>

          <div class="note-box">
            <p>
              <strong>Important:</strong> Please keep your registration ID safe for future reference.
              You can use it to track your application status.
            </p>
          </div>
        </div>

        <div class="action-buttons">
          <button *ngIf="fromAdmin" class="btn btn-secondary" (click)="goToAdminUsers()">
            View All Users (Admin)
          </button>
          <button class="btn btn-primary" (click)="goToLogin()">
            Go to Login
          </button>
          <button class="btn btn-secondary" (click)="goToHome()">
            Back to Home
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .success-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }

    .success-content {
      background: white;
      border-radius: 1.5rem;
      padding: 3rem;
      max-width: 600px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.5s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .success-icon {
      margin-bottom: 2rem;
      display: flex;
      justify-content: center;
    }

    .checkmark-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: scaleIn 0.5s ease 0.3s backwards;
    }

    @keyframes scaleIn {
      from {
        transform: scale(0);
      }
      to {
        transform: scale(1);
      }
    }

    .checkmark {
      width: 50px;
      height: 50px;
      border-right: 5px solid white;
      border-bottom: 5px solid white;
      transform: rotate(45deg);
      animation: drawCheck 0.5s ease 0.5s backwards;
    }

    @keyframes drawCheck {
      from {
        width: 0;
        height: 0;
      }
      to {
        width: 50px;
        height: 50px;
      }
    }

    h1 {
      margin: 0 0 1rem 0;
      font-size: 2rem;
      color: #1f2937;
      font-weight: 700;
    }

    .success-message {
      margin: 0 0 2rem 0;
      color: #6b7280;
      font-size: 1.125rem;
    }

    .registration-details {
      text-align: left;
      margin-bottom: 2rem;

      .detail-card {
        background: #f9fafb;
        border: 2px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .detail-label {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .detail-value {
          color: #667eea;
          font-size: 1.25rem;
          font-weight: 700;
          font-family: 'Courier New', monospace;
        }
      }

      .info-box {
        background: #eff6ff;
        border: 2px solid #3b82f6;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;

        h3 {
          margin: 0 0 1rem 0;
          color: #1e40af;
          font-size: 1.125rem;
        }

        ul {
          list-style: none;
          padding: 0;
          margin: 0;

          li {
            color: #1e3a8a;
            margin-bottom: 0.75rem;
            font-size: 0.9375rem;

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }

      .note-box {
        background: #fef3c7;
        border: 2px solid #f59e0b;
        border-radius: 0.75rem;
        padding: 1.5rem;

        p {
          margin: 0;
          color: #78350f;
          font-size: 0.9375rem;

          strong {
            font-weight: 700;
          }
        }
      }
    }

    .action-buttons {
      display: flex;
      gap: 1rem;

      .btn {
        flex: 1;
        padding: 1rem 2rem;
        border: none;
        border-radius: 0.5rem;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.3s ease;

        &.btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;

          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          }
        }

        &.btn-secondary {
          background: #f3f4f6;
          color: #374151;

          &:hover {
            background: #e5e7eb;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .success-content {
        padding: 2rem;
      }

      h1 {
        font-size: 1.5rem;
      }

      .action-buttons {
        flex-direction: column;
      }
    }
  `]
})
export class RegistrationSuccessComponent implements OnInit {
  registrationId = '';
  fromAdmin = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // When registration was launched from admin, show a clear way back to admin user list.
    this.fromAdmin = sessionStorage.getItem('fromAdmin') === 'true';
    this.route.queryParams.subscribe(params => {
      this.registrationId = params['registrationId'] || 'N/A';
    });
  }

  goToAdminUsers(): void {
    this.router.navigate(['/admin/users-list']);
  }

  goToLogin(): void {
    this.router.navigate(['/mobile/auth/login']);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}
