import { PrismaClient } from "@prisma/client";

const prismaClient = new PrismaClient({
    log:
        process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

const connectDB = async () => {
    try {
        await prismaClient.$connect()
        console.log("Database connected")
    } catch (error) {
        console.error("Database connection failed", error)
        process.exit(1)
    }
}

const disconnectDB = async () => {
    try {
        await prismaClient.$disconnect()
        console.log("Database disconnected")
    } catch (error) {
        console.error("Database disconnection failed", error)
        process.exit(1)
    }
}


export { prismaClient, connectDB, disconnectDB }