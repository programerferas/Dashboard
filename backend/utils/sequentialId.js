// Human-readable business IDs: C001, O001, P001.
//
// Why not just use the database's autoincrement `id`? Because the shop writes
// "C001" on the order sheet and says it out loud on the phone. The numeric `id`
// stays the internal primary key; this is the label people use.
//
// How the next number is found: the newest row always holds the highest number
// (numbers are only ever handed out by this function, in ascending order), so we
// read the newest row and add one. Deleting rows is safe — the next number is
// still free.

export const formatId = (prefix, number, width = 3) =>
  `${prefix}${String(number).padStart(width, "0")}`;

export const nextSequentialId = async (client, { model, field, prefix, width = 3 }) => {
  const newest = await client[model].findFirst({
    orderBy: { id: "desc" },
    select: { [field]: true },
  });

  const lastNumber = newest ? Number(newest[field].slice(prefix.length)) : 0;
  // A non-numeric suffix (hand-edited data) must not produce "CNaN".
  const safeLast = Number.isFinite(lastNumber) ? lastNumber : 0;

  return formatId(prefix, safeLast + 1, width);
};

// Two employees can press "Add customer" at the same moment and both read the
// same newest row. The unique constraint on the ID column catches it; we simply
// try again. Prisma reports a unique violation as error code P2002.
export const createWithSequentialId = async (client, options, buildCreate, attempts = 5) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const id = await nextSequentialId(client, options);
    try {
      return await buildCreate(id);
    } catch (error) {
      const isDuplicateId = error?.code === "P2002" && attempt < attempts;
      if (!isDuplicateId) throw error;
    }
  }
  throw new Error(`Could not allocate a unique ${options.field} after ${attempts} attempts`);
};
