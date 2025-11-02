using GroupManagementService.Models;  
using GroupManagementService.Services;  
using Microsoft.AspNetCore.Mvc;  

namespace GroupManagementService.Controllers
{
    // Đánh dấu class này là API Controller
    [ApiController]
    // Đặt route mặc định cho tất cả các action trong controller này
    [Route("api/groups")]
    public class GroupController : ControllerBase
    {
        // Khai báo service để xử lý logic nghiệp vụ liên quan đến nhóm
        private readonly GroupService _service;
        
        // Constructor: nhận GroupService thông qua dependency injection và gán vào _service
        public GroupController(GroupService service) => _service = service;

        // API endpoint GET: lấy danh sách tất cả các nhóm
        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await _service.GetAllGroupsAsync());

        // API endpoint GET với tham số id: lấy thông tin một nhóm cụ thể theo ID
        [HttpGet("{id}")]
        public async Task<IActionResult> Get(int id)
        {
            // Gọi service để lấy nhóm theo ID
            var group = await _service.GetGroupByIdAsync(id);
            // Nếu không tìm thấy thì trả về 404, nếu có thì trả về 200 với dữ liệu nhóm
            return group == null ? NotFound() : Ok(group);
        }

        // API endpoint POST: tạo một nhóm mới
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateGroupRequest request)
        {
            // Kiểm tra dữ liệu đầu vào có hợp lệ không (validation)
            if (!ModelState.IsValid)
            {
                // Nếu không hợp lệ thì trả về 400 Bad Request kèm thông báo lỗi
                return BadRequest(ModelState);
            }

            // Chuyển đổi từ request model sang domain model Group
            var group = new Group
            {
                Name = request.Name,  // Gán tên nhóm từ request
                // Chuyển đổi danh sách thành viên từ request sang danh sách Member
                Members = request.Members.Select(m => new Member
                {
                    FullName = m.FullName,  // Gán tên đầy đủ của thành viên
                    IsCoOwner = m.IsCoOwner  // Gán quyền đồng sở hữu
                }).ToList()
            };

            // Gọi service để tạo nhóm mới
            var created = await _service.CreateGroupAsync(group);
            // Trả về 201 Created với header Location trỏ đến API GET để lấy nhóm vừa tạo
            return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
        }

        // API endpoint PUT: cập nhật thông tin nhóm
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateGroupRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var updated = await _service.UpdateGroupAsync(id, request.Name);
            return updated == null ? NotFound() : Ok(updated);
        }

        // API endpoint DELETE: xóa nhóm
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var ok = await _service.DeleteGroupAsync(id);
            return ok ? NoContent() : NotFound();
        }

        // API endpoint POST: thêm thành viên vào nhóm đã có
        [HttpPost("{groupId}/members")]
        public async Task<IActionResult> AddMember(int groupId, [FromBody] AddMemberRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var member = new Member { FullName = request.FullName, IsCoOwner = request.IsCoOwner };
            var group = await _service.AddMemberAsync(groupId, member);
            return group == null ? NotFound() : Ok(group);
        }

        // API endpoint DELETE: xóa thành viên khỏi nhóm
        [HttpDelete("{groupId}/members/{memberId}")]
        public async Task<IActionResult> RemoveMember(int groupId, int memberId)
        {
            var ok = await _service.RemoveMemberAsync(groupId, memberId);
            return ok ? NoContent() : NotFound();
        }
    }
}
