declare module 'jwt-decode' {
  function jwtDecode<T = any>(token: string): T;
  export default jwtDecode;
}
