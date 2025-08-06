declare module 'xss-clean' {
  import { RequestHandler } from 'express';
  function xss(): RequestHandler;
  export default xss;
}

declare module 'hpp' {
  import { RequestHandler } from 'express';
  function hpp(): RequestHandler;
  export default hpp;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export {}; 