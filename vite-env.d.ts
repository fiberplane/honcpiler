/// <reference types="vite/client" />

declare module "*.ts?raw" {
  const content: string;
  export default content;
}
