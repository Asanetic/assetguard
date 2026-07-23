export async function POST(request) {
    
        const { searchParams } = new URL(request.url);
        const queryParams = Object.fromEntries(searchParams.entries());
        return Response.json({ status: 'success', rowsAffected: "res.affectedRows" });
}
