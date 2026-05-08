import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {FormsModule} from '@angular/forms';

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
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('canvas', {static: false}) canvasRef!: ElementRef<HTMLCanvasElement>;
  activeTab: 'draw' | 'upload' | 'info' = 'draw';
  uploadedImage: string | null = null;
  uploadedFile: File | null = null;
  result: string | null = null;
  error: string | null = null;
  isLoading = false;
  isOnline = false;
  modelInfo: ModelInfo | null = null;
  private ctx!: CanvasRenderingContext2D;
  private isDrawing = false;
  private readonly apiUrl = 'https://lithuanian-sentences-recognition-api.onrender.com';

  constructor(private http: HttpClient) {
  }

  ngOnInit(): void {
    this.checkServerStatus();
    this.loadModelInfo();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initCanvas(), 0);
  }

  switchTab(tab: 'draw' | 'upload' | 'info'): void {
    this.activeTab = tab;
    this.result = null;
    this.error = null;

    if (tab === 'draw') {
      setTimeout(() => this.initCanvas(), 0);
    }
  }

  startDrawing(event: MouseEvent | TouchEvent): void {
    this.isDrawing = true;
    const pos = this.getPosition(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawing) return;

    event.preventDefault();
    const pos = this.getPosition(event);
    this.ctx.lineWidth = 1;
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing(): void {
    this.isDrawing = false;
  }

  clearCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.fillStyle = 'white';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.result = null;
    this.error = null;
  }

  recognizeDrawing(): void {
    const canvas = this.canvasRef.nativeElement;

    const offscreen = document.createElement('canvas');
    offscreen.width = canvas.width;
    offscreen.height = canvas.height;
    const offCtx = offscreen.getContext('2d')!;

    offCtx.drawImage(canvas, 0, 0);

    const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    offCtx.putImageData(imageData, 0, 0);

    const base64Image = offscreen.toDataURL('image/png');
    this.predict(base64Image);
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

  copyToClipboard(): void {
    if (this.result) {
      navigator.clipboard.writeText(this.result).then(() => {
        alert('Tekstas nukopijuotas!');
      });
    }
  }

  private initCanvas(): void {
    if (!this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    canvas.width = 2262;
    canvas.height = 199;

    this.ctx = canvas.getContext('2d')!;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.ctx.strokeStyle = '#2a2a2a';
    this.ctx.lineWidth = 1;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }

  private getPosition(event: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Mastelių santykis tarp tikro canvas dydžio ir ekrano dydžio
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (event instanceof MouseEvent) {
      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY
      };
    } else {
      const touch = event.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
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
