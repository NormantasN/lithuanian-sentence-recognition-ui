import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

interface PredictionResponse {
  success: boolean;
  text?: string;
  error?: string;
}

interface ModelInfo {
  success: boolean;
  vocabulary?: string;
  vocab_size?: number;
  max_text_length?: number;
  image_height?: number;
  image_width?: number;
  error?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  activeTab: 'upload' | 'info' = 'upload';
  uploadedImage: string | null = null;
  uploadedFile: File | null = null;

  result: string | null = null;
  error: string | null = null;
  isLoading = false;
  isOnline = false;
  modelInfo: ModelInfo | null = null;

  private readonly apiUrl = 'https://lithuanian-sentences-recognition-api.onrender.com';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.checkServerStatus();
    this.loadModelInfo();
  }

  switchTab(tab: 'upload' | 'info'): void {
    this.activeTab = tab;
    this.result = null;
    this.error = null;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.uploadedFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImage = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      this.result = null;
      this.error = null;
    }
  }

  recognizeUploadedImage(): void {
    if (this.uploadedImage) {
      this.predict(this.uploadedImage);
    }
  }

  private predict(base64Image: string): void {
    this.isLoading = true;
    this.result = null;
    this.error = null;

    this.http.post<PredictionResponse>(`${this.apiUrl}/predict`, {
      image: base64Image
    }).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.text) {
          this.result = response.text;
        } else {
          this.error = response.error || 'Nežinoma klaida';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = `Serverio klaida: ${err.message}`;
      }
    });
  }

  copyToClipboard(): void {
    if (this.result) {
      navigator.clipboard.writeText(this.result).then(() => {
        alert('Tekstas nukopijuotas!');
      });
    }
  }

  private checkServerStatus(): void {
    this.http.get(`${this.apiUrl}/health`).subscribe({
      next: () => {
        this.isOnline = true;
      },
      error: () => {
        this.isOnline = false;
      }
    });
  }

  private loadModelInfo(): void {
    this.http.get<ModelInfo>(`${this.apiUrl}/info`).subscribe({
      next: (info) => {
        if (info.success) {
          this.modelInfo = info;
        }
      },
      error: (err) => {
        console.error('Nepavyko gauti modelio informacijos:', err);
      }
    });
  }
}
