import fastify from "fastify";
const port : number = 3000;
const app = fastify();

app.get("/", async (request, reply) => {
  return { message: "Hello, World!" };
});

app.listen({ port }, (err, port) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listen at ${port}`);
}); 

