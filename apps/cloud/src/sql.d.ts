// .sql files are bundled as text (wrangler "Text" rule): the migrations the Durable Object replays.
declare module '*.sql' {
  const text: string;
  export default text;
}
