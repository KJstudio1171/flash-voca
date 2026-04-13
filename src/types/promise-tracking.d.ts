declare module "promise/setimmediate/rejection-tracking" {
  const tracking: {
    enable(options: {
      allRejections?: boolean;
      onUnhandled?: (id: number, error: unknown) => void;
      onHandled?: (id: number) => void;
    }): void;
  };
  export default tracking;
}
