using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using ECommerce.Api.Data;

#nullable disable
namespace ECommerce.Api.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260711190000_InitialIdentity")]
public partial class InitialIdentity : Migration
{
    protected override void Up(MigrationBuilder m)
    {
        m.CreateTable("AspNetRoles", t => new { Id = t.Column<Guid>(nullable: false), Name = t.Column<string>(maxLength: 256, nullable: true), NormalizedName = t.Column<string>(maxLength: 256, nullable: true), ConcurrencyStamp = t.Column<string>(nullable: true) }, constraints: t => t.PrimaryKey("PK_AspNetRoles", x => x.Id));
        m.CreateTable("AspNetUsers", t => new { Id = t.Column<Guid>(nullable: false), UserName = t.Column<string>(maxLength: 256, nullable: true), NormalizedUserName = t.Column<string>(maxLength: 256, nullable: true), Email = t.Column<string>(maxLength: 256, nullable: true), NormalizedEmail = t.Column<string>(maxLength: 256, nullable: true), EmailConfirmed = t.Column<bool>(nullable: false), PasswordHash = t.Column<string>(nullable: true), SecurityStamp = t.Column<string>(nullable: true), ConcurrencyStamp = t.Column<string>(nullable: true), PhoneNumber = t.Column<string>(nullable: true), PhoneNumberConfirmed = t.Column<bool>(nullable: false), TwoFactorEnabled = t.Column<bool>(nullable: false), LockoutEnd = t.Column<DateTimeOffset>(nullable: true), LockoutEnabled = t.Column<bool>(nullable: false), AccessFailedCount = t.Column<int>(nullable: false) }, constraints: t => t.PrimaryKey("PK_AspNetUsers", x => x.Id));
        m.CreateTable("AspNetRoleClaims", t => new { Id = t.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"), RoleId = t.Column<Guid>(nullable: false), ClaimType = t.Column<string>(nullable: true), ClaimValue = t.Column<string>(nullable: true) }, constraints: t =>
        {
            t.PrimaryKey("PK_AspNetRoleClaims", x => x.Id);
            t.ForeignKey("FK_AspNetRoleClaims_AspNetRoles_RoleId", x => x.RoleId, "AspNetRoles", "Id", onDelete: ReferentialAction.Cascade);
        });
        m.CreateTable("AspNetUserClaims", t => new { Id = t.Column<int>(nullable: false).Annotation("SqlServer:Identity", "1, 1"), UserId = t.Column<Guid>(nullable: false), ClaimType = t.Column<string>(nullable: true), ClaimValue = t.Column<string>(nullable: true) }, constraints: t => { t.PrimaryKey("PK_AspNetUserClaims", x => x.Id); t.ForeignKey("FK_AspNetUserClaims_AspNetUsers_UserId", x => x.UserId, "AspNetUsers", "Id", onDelete: ReferentialAction.Cascade); });
        m.CreateTable("AspNetUserLogins", t => new { LoginProvider = t.Column<string>(maxLength: 128, nullable: false), ProviderKey = t.Column<string>(maxLength: 128, nullable: false), ProviderDisplayName = t.Column<string>(nullable: true), UserId = t.Column<Guid>(nullable: false) }, constraints: t => { t.PrimaryKey("PK_AspNetUserLogins", x => new { x.LoginProvider, x.ProviderKey }); t.ForeignKey("FK_AspNetUserLogins_AspNetUsers_UserId", x => x.UserId, "AspNetUsers", "Id", onDelete: ReferentialAction.Cascade); });
        m.CreateTable("AspNetUserRoles", t => new { UserId = t.Column<Guid>(nullable: false), RoleId = t.Column<Guid>(nullable: false) }, constraints: t => { t.PrimaryKey("PK_AspNetUserRoles", x => new { x.UserId, x.RoleId }); t.ForeignKey("FK_AspNetUserRoles_AspNetRoles_RoleId", x => x.RoleId, "AspNetRoles", "Id", onDelete: ReferentialAction.Cascade); t.ForeignKey("FK_AspNetUserRoles_AspNetUsers_UserId", x => x.UserId, "AspNetUsers", "Id", onDelete: ReferentialAction.Cascade); });
        m.CreateTable("AspNetUserTokens", t => new { UserId = t.Column<Guid>(nullable: false), LoginProvider = t.Column<string>(maxLength: 128, nullable: false), Name = t.Column<string>(maxLength: 128, nullable: false), Value = t.Column<string>(nullable: true) }, constraints: t => { t.PrimaryKey("PK_AspNetUserTokens", x => new { x.UserId, x.LoginProvider, x.Name }); t.ForeignKey("FK_AspNetUserTokens_AspNetUsers_UserId", x => x.UserId, "AspNetUsers", "Id", onDelete: ReferentialAction.Cascade); });
        m.CreateIndex("IX_AspNetRoleClaims_RoleId", "AspNetRoleClaims", "RoleId");
        m.CreateIndex("RoleNameIndex", "AspNetRoles", "NormalizedName", unique: true, filter: "[NormalizedName] IS NOT NULL");
        m.CreateIndex("IX_AspNetUserClaims_UserId", "AspNetUserClaims", "UserId");
        m.CreateIndex("IX_AspNetUserLogins_UserId", "AspNetUserLogins", "UserId");
        m.CreateIndex("IX_AspNetUserRoles_RoleId", "AspNetUserRoles", "RoleId");
        m.CreateIndex("EmailIndex", "AspNetUsers", "NormalizedEmail");
        m.CreateIndex("UserNameIndex", "AspNetUsers", "NormalizedUserName", unique: true, filter: "[NormalizedUserName] IS NOT NULL");
    }

    protected override void Down(MigrationBuilder m)
    {
        m.DropTable("AspNetRoleClaims");
        m.DropTable("AspNetUserClaims");
        m.DropTable("AspNetUserLogins");
        m.DropTable("AspNetUserRoles");
        m.DropTable("AspNetUserTokens");
        m.DropTable("AspNetRoles");
        m.DropTable("AspNetUsers");
    }
}
