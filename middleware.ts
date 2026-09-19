// El gate de usuario/contraseña para todo el sitio (agregado en 221f08c) se
// sacó por pedido explícito: la app es pública, cualquiera tiene que poder
// crear una cuenta y entrar por su cuenta con el login real (Supabase Auth,
// ver `src/auth`), sin una capa extra de acceso compartido delante.
// Este archivo queda vacío (sin `export default`) para que Vercel no
// registre ningún middleware — no hace falta borrar el archivo.
