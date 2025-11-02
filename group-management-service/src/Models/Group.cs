namespace GroupManagementService.Models
{
    // Model đại diện cho một nhóm (Group) trong hệ thống
    public class Group
    {
        // ID duy nhất của nhóm (khóa chính)
        public int Id { get; set; }
        
        // Tên của nhóm
        public string Name { get; set; } = string.Empty;
        
        // Danh sách các thành viên thuộc nhóm này
        public List<Member> Members { get; set; } = new();
        
        // Danh sách các cuộc bỏ phiếu trong nhóm này
        public List<Vote> Votes { get; set; } = new();

        // Danh sách các quỹ của nhóm
        public List<Fund> Funds { get; set; } = new();
    }
}
