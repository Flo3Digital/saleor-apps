// write a function that will turn a string into a slug
const slugify = (str: string) => {
  const slug = str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
    .replace(/\s+/g, "-") // collapse whitespace and replace by -
    .replace(/-+/g, "-"); // collapse dashes

  return slug;
};

export { slugify };
