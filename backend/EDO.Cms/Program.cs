using EDO.Cms.PocBootstrap;

WebApplicationBuilder builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options => options.AddPolicy("EdoFrontend", policy => policy
    .WithOrigins("http://localhost:5173")
    .WithHeaders("Accept", "Content-Type")
    .WithMethods("GET", "HEAD", "OPTIONS")));

builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddDeliveryApi()
    .AddComposers()
    .Build();

WebApplication app = builder.Build();

await app.BootUmbracoAsync();

// Allow the local read-only frontend to request public Delivery API content.
app.UseCors("EdoFrontend");

app.UseUmbraco()
    .WithMiddleware(u =>
    {
        u.UseBackOffice();
        u.UseWebsite();
    })
    .WithEndpoints(u =>
    {
        u.UseBackOfficeEndpoints();
        u.UseWebsiteEndpoints();
    });

await app.RunAsync();
