export const API_URL = "http://localhost:8080/api/auth";

export interface LoginRequest {
  username: string;
  password: string;
}

export async function login(request: LoginRequest) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Error en el inicio de sesión");
    }

    return await response.json();
  } catch (error: any) {
    throw new Error(error.message || "Error inesperado en la conexión");
  }
}
