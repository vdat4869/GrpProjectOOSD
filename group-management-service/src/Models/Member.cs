namespace GroupManagementService.Models
{
    public class Member
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public bool IsCoOwner { get; set; } = false;
    }
}
