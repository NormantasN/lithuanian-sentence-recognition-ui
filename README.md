# Lithuanian Handwriting Recognition – UI

Angular web interface for the Lithuanian handwriting recognition API.

## Features

- Draw text directly in the browser (199×2262px canvas)
- Upload a handwriting image (PNG, JPG)
- Displays recognition result with copy to clipboard
- Shows model metadata (vocab, image size, etc.)

## Setup

```bash
npm install
ng serve
```

Configure the API URL in `app.component.ts`:

```ts
private readonly apiUrl = 'https://your-api-url';
```

## Stack

- Angular
- TypeScript
