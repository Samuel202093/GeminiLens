declare module "xlsx" {
  // Minimal shape to satisfy TypeScript in this project.
  // The actual library exports many more types; we keep this lightweight.
  export const utils: {
    aoa_to_sheet: (data: any[][]) => any;
    book_new: () => any;
    book_append_sheet: (wb: any, ws: any, name: string) => void;
  };
  export function writeFile(workbook: any, filename: string): void;
  const _default: any;
  export default _default;
}