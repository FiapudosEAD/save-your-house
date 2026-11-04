// Permite que o Node rode os módulos do app (imports sem extensão, como no Metro).
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (e) {
    if (specifier.startsWith('.') && !specifier.endsWith('.js')) return next(`${specifier}.js`, context);
    throw e;
  }
}
