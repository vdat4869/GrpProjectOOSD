namespace GroupManagementService.Models
{
    // Model đại diện cho một thành viên (Member) trong nhóm
    public class Member
    {
        // ID duy nhất của thành viên (khóa chính)
        public int Id { get; set; }
        
        // Tên đầy đủ của thành viên
        public string FullName { get; set; } = string.Empty;
        
        // Cờ xác định thành viên có phải là đồng sở hữu (co-owner) hay không
        // true = là đồng sở hữu, false = thành viên thường
        public bool IsCoOwner { get; set; } = false;
    }
}
