
import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { cors } from 'hono/cors'

const app = new Hono<{
  Bindings: {
    DATABASE_URL: string;
  },
}>();
app.use('/*', cors())

type BookingElement = {
  movieId: number;
  seatname: string;
  name: string;
  age: number;
  gender: string;
  contactNumber: string;
};

app.post('/api/bookings', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    // Parse the JSON body as an array of BookingElement
    const body: BookingElement[] = await c.req.json();
    console.log(body)

    // Loop through each booking and create them in the database
    const results = await Promise.all(
      body.map(async (element: BookingElement) => {
        return await prisma.seat.create({
          data: {
            seatname: element.seatname,
            name: element.name,
            age: String(element.age), // Ensure age is stored as a string if required
            gender: element.gender,
            mobile: element.contactNumber,
            Movie: {
              connect: {
                id: Number(element.movieId),
              },
            },
          },
        });
      })
    );

    // Return successful response
    return c.json({
      msg: 'All bookings created successfully.',
      bookings: results,
    }, 200);
  } catch (error) {
    console.error('Error creating bookings:', error);
    return c.json({
      msg: 'Failed to create bookings.',
    }, 500);
  }
});
app.get('/api/movies', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const movies = await prisma.movie.findMany();
    return c.json({
      success: true,
      data: movies,
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    return c.json({
      success: false,
      message: 'Error fetching movies' + error,
    }, 500);
  }
});

// Handle POST request to add a new movie
app.post('/api/movies', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    // Parse form data
    const formData = await c.req.parseBody<{ [key: string]: File | string }>();

    const title = formData['title'] as string;
    const director = formData['directorName'] as string;
    const description = formData['description'] as string;
    const time = formData['showTime'] as string;
    const date = formData['showDate'] as string;
    const imageFile = formData['image'];

    // Process image if provided
    let imageBuffer = null;
    if (imageFile instanceof File) {
      imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    }

    // Save the movie in the database
    const newMovie = await prisma.movie.create({
      data: {
        title,
        director,
        description,
        time,
        date,
        image: imageBuffer || undefined, // Only insert image if it exists
      },
    });

    return c.json({
      success: true,
      message: 'Movie added successfully',
      data: newMovie,
    });
  } catch (error) {
    console.error('Error adding movie:', error);
    return c.json({
      success: false,
      message: 'Error adding movie',
    }, 500);
  }
});
app.post('/seats', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    // Parse the request body to extract movieid
    const { movieid } = await c.req.json();

    if (!movieid) {
      return c.json({ msg: 'Movie ID is required.' }, 400);
    }

    // Fetch booked seats based on the movie ID
    const seats = await prisma.seat.findMany({
      where: {
        MovieId: Number(movieid), // Ensure movieId is a number
      },
    });

    return c.json({
      msg: 'Success',
      seats,
    });
  } catch (error) {
    console.error('Error fetching seats:', error);
    return c.json({ msg: 'Internal server error.' }, 500);
  }
});

app.post('/users', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    // Parse the request body to get email, password, and role
    const { email, password, role } = await c.req.json();

    // Check if a user with the same email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return c.json(
        { error: 'User with this email already exists' },
        400
      );
    }

    // Create the new user in the database
    const newUser = await prisma.user.create({
      data: {
        email,
        password, // Remember to hash the password in production for security
        role,     // role can be 'admin' or 'user'
      },
    });

    // Return a success response
    return c.json(
      { message: 'User created successfully', user: newUser },
      201
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return c.json(
      { error: 'Something went wrong' },
      500
    );
  }
});
// app.get("api/test",await (c)=>{
  
// });


app.get('/api/test', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const res = await prisma.movie.findMany();
  console.log(res)
  return Response.json({
    msg:"test"
  })
});
app.post('/api/signup', async (c) => {
  const env = c.env as { DATABASE_URL: string };
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const { email, password, role } = await c.req.json();

    // Check if a user with the same email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email },
    });

    if (existingUser) {
      return c.json(
        { error: "User with this email already exists" },
        400
      );
    }

    // Hash the password for security
    // const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password,
        role,
      },
    });

    return c.json(
      { message: "User created successfully", user: newUser },
      201
    );
  } catch (error) {
    console.error("Error creating user:", error);
    return c.json(
      { error: "Something went wrong" },
      500
    );
  } finally {
    await prisma.$disconnect();
  }
});
app.post('/api/seats', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    // Parse the request body to extract movieId
    const { movieid } = await c.req.json();
    // console.log(movieid)

    if (!movieid) {
      return c.json({ error: 'Movie ID is required' }, 400);
    }

    // Fetch the movie details
    const movie = await prisma.movie.findUnique({
      where: { id: Number(movieid) },
      include: {
        seats: true, // Include associated seat details
      },
    });
    // console.log(movie)

    if (!movie) {
      return c.json({ error: 'Movie not found' }, 404);
    }

    return c.json({
      success: true,
      movie: {
        id: movie.id,
        title: movie.title,
        director: movie.director,
        description: movie.description,
        time: movie.time,
        date: movie.date,
        seats: movie.seats, // List of booked seats
      },
    });
  } catch (error) {
    console.error('Error fetching seats for the movie:', error);
    return c.json({ error: 'Internal server error' }, 500);
  } finally {
    await prisma.$disconnect();
  }
});


// Mock data (replace with database or real data source)


// Endpoint to get users
app.get('/api/users', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const users = await prisma.user.findMany();  // Fetch users from the 'user' model
    return c.json(users);  // Return users as a JSON response
  } catch (error) {
    console.error('Error fetching users:', error);
    return c.json({ error: 'Failed to fetch users' }, 500);  // Return error response in case of failure
  }
});
app.get('/api/getmovies', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  try {
    const movies = await prisma.movie.findMany(
      {
        select:{
          id:true,
          title:true,
          director:true,
          type:true,
          description:true
        }
      }
    );

    return c.json({
      success: true,
      data: movies,
    });
  } catch (error) {
    console.error('Error fetching movies:', error);
    return c.json({
      success: false,
      message: 'Error fetching movies' + error,
    }, 500);
  }
});


export default app;
